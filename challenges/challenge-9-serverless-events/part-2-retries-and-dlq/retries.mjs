// STEP 1: the guard first. This part creates queues on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { resetEmulator, sqs as makeSqs } from '../../../toolkit/aws.js';
import { deliver } from '../../../toolkit/models/sqs.js';
import { main } from '../../../toolkit/part.js';
import { createQueue, deleteMessage, queueArn, queueAttributes, receiveOne, sendMessage, sleep } from '../shared.mjs';

export const title = 'Challenge 9, part 2: retries and the dead-letter queue';

// STEP 2: the two queues (your turn). Create the dead-letter queue 'daftar-jobs-dlq', then the main queue 'daftar-jobs' with
// a visibility timeout of 1 second (short, so this drill is quick; the AWS default is 30 seconds) and a redrive policy:
// after 3 receives without a delete, SQS moves the message to the dead-letter queue.
// Return { jobs, dlq } as queue URLs. The RedrivePolicy attribute is a JSON text: { deadLetterTargetArn, maxReceiveCount }.
export async function createQueues(sqs) {
  // YOUR TURN start
  // HINT: createQueue(sqs, name, attributes) is in ../shared.mjs. Attribute values are texts: VisibilityTimeout: '1'.
  // HINT: queueArn('daftar-jobs-dlq') gives the ARN of the dead-letter queue.
  // YOUR TURN end
}

// STEP 3: a worker that fails on a poison message. Provided. A message is poison when its body says so.
export async function work(sqs, url, rounds = 8) {
  const seen = [];
  for (let i = 0; i < rounds; i++) {
    const message = await receiveOne(sqs, url);
    if (!message) {
      await sleep(1200);
      continue;
    }
    const body = JSON.parse(message.Body);
    seen.push({ id: body.id, receive: Number(message.Attributes?.ApproximateReceiveCount ?? 0) });
    if (body.poison) continue; // fail: do not delete, the message comes back after the visibility timeout
    await deleteMessage(sqs, url, message);
  }
  return seen;
}

// STEP 4: break it on purpose. A slow handler (1.5 s) with a 1 s visibility timeout: the message comes back while the first
// worker is still busy, and a second worker gets it too. Provided.
export async function duplicateDemo(sqs, url) {
  await sendMessage(sqs, url, { id: 'slow-1' });
  const first = await receiveOne(sqs, url);
  await sleep(1200); // the first worker is still working; the timeout has passed
  const second = await receiveOne(sqs, url);
  return { firstId: first && JSON.parse(first.Body).id, secondId: second && JSON.parse(second.Body).id, bothGotIt: Boolean(first && second && first.MessageId === second.MessageId) };
}

export async function drill() {
  const sqs = makeSqs();
  await resetEmulator();
  const { jobs, dlq } = await createQueues(sqs);
  await sendMessage(sqs, jobs, { id: 'good-1' });
  await sendMessage(sqs, jobs, { id: 'poison-1', poison: true });
  const seen = await work(sqs, jobs, 12);
  const inDlq = await receiveOne(sqs, dlq);
  const attrs = await queueAttributes(sqs, jobs);
  const dup = await duplicateDemo(sqs, jobs);
  return { seen, dlqMessage: inDlq && JSON.parse(inDlq.Body), redrive: JSON.parse(attrs.RedrivePolicy ?? '{}'), visibility: attrs.VisibilityTimeout, dup };
}

export async function run() {
  const d = await drill();
  const model = [
    { id: 'clean', msg: { id: 'clean' } },
    { id: 'fails twice', msg: { id: 'b', failAttempts: 2 } },
    { id: 'fails three times', msg: { id: 'c', failAttempts: 3 } },
    { id: 'poison', msg: { id: 'd', poison: true } },
  ].map(({ id, msg }) => ({ id, ...deliver(msg, { visibilityTimeout: 30, maxReceiveCount: 3, handlerSeconds: 5 }) }));
  const slow = deliver({ id: 'e' }, { visibilityTimeout: 30, maxReceiveCount: 3, handlerSeconds: 40 });
  const poisonReceives = d.seen.filter((s) => s.id === 'poison-1').length;
  return {
    facts: [
      ['Queue settings read back', `visibility timeout ${d.visibility} s, redrive after ${d.redrive.maxReceiveCount} receives to ${d.redrive.deadLetterTargetArn?.split(':').at(-1)}`],
      ['Poison message received by the worker', `${poisonReceives} times, then it moved to the dead-letter queue`],
      ['In the dead-letter queue', d.dlqMessage ? d.dlqMessage.id : 'nothing'],
      ['Visibility timeout too short (slow handler)', d.dup.bothGotIt ? `the same message went to two workers (${d.dup.firstId})` : 'no duplicate seen'],
      ['Timeouts and times in the table', 'the model uses the AWS default of 30 seconds; the emulator drill uses 1 second so it runs fast'],
    ],
    head: ['Message (model, 30 s timeout, 3 receives)', 'Outcome', 'Receives', 'Effects', 'Finished at (s)'],
    rows: [...model.map((m) => [m.id, m.outcome, m.receives, m.effects, m.finishedAt]), ['handler takes 40 s', slow.outcome, slow.receives, slow.effects, slow.finishedAt]],
  };
}

main(import.meta.url, run);
