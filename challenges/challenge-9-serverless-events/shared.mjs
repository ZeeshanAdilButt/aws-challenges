// Shared by the three parts of challenge 9: the bucket, the queues, and a local handler that stands in for a function.
import { CreateBucketCommand, GetBucketNotificationConfigurationCommand, GetObjectCommand, PutBucketNotificationConfigurationCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CreateQueueCommand, GetQueueAttributesCommand, ReceiveMessageCommand, DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';

export const BUCKET = 'daftar-uploads';
export const ACCOUNT = '123456789012';
export const queueArn = (name) => `arn:aws:sqs:us-east-1:${ACCOUNT}:${name}`;

export async function createQueue(sqs, name, attributes = {}) {
  const { QueueUrl } = await sqs.send(new CreateQueueCommand({ QueueName: name, Attributes: attributes }));
  return QueueUrl;
}

export async function queueAttributes(sqs, url) {
  return (await sqs.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['All'] }))).Attributes;
}

// Ask S3 to put an event on a queue for every new object. The emulator does this itself when an object is put.
export async function connectBucketToQueue(s3, queueName) {
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  await s3.send(new PutBucketNotificationConfigurationCommand({
    Bucket: BUCKET,
    NotificationConfiguration: { QueueConfigurations: [{ QueueArn: queueArn(queueName), Events: ['s3:ObjectCreated:*'] }] },
  }));
  return (await s3.send(new GetBucketNotificationConfigurationCommand({ Bucket: BUCKET }))).QueueConfigurations;
}

export async function upload(s3, key, body) {
  const { ETag } = await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }));
  return ETag;
}

// Take every S3 record out of a queue message. The body is the event S3 sends: { Records: [...] }.
export function recordsOf(message) {
  const body = JSON.parse(message.Body);
  return (body.Records ?? []).filter((r) => r.s3).map((r) => ({ bucket: r.s3.bucket.name, key: decodeURIComponent(r.s3.object.key.replaceAll('+', ' ')), etag: r.s3.object.eTag, size: r.s3.object.size }));
}

export async function receiveOne(sqs, url, options = {}) {
  const { Messages } = await sqs.send(new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: 0, ...options }));
  return Messages?.[0] ?? null;
}

export const deleteMessage = (sqs, url, message) => sqs.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: message.ReceiptHandle }));
export const sendMessage = (sqs, url, body) => sqs.send(new SendMessageCommand({ QueueUrl: url, MessageBody: typeof body === 'string' ? body : JSON.stringify(body) }));

export async function readObject(s3, bucket, key) {
  return (await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body.transformToString();
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// moto (like S3) first puts a test message on the queue when the notification is set up. Skip it and take the next real one.
export async function receiveEvent(sqs, url) {
  for (let i = 0; i < 5; i++) {
    const message = await receiveOne(sqs, url, { WaitTimeSeconds: 1 });
    if (!message) return null;
    if (JSON.parse(message.Body).Event === 's3:TestEvent') {
      await deleteMessage(sqs, url, message);
      continue;
    }
    return message;
  }
  return null;
}
