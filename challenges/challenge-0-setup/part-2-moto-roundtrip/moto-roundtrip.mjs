// STEP 1: the guard first, then the clients. aws.js imports the guard too, so a client cannot exist without it.
import '../../../toolkit/guard.js';
import { CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { resetEmulator, s3 } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 0, part 2: moto up, list buckets, down';
export const BUCKET = 'daftar-setup-check';

export async function run() {
  const client = s3();
  const names = async () => (await client.send(new ListBucketsCommand({}))).Buckets.map((b) => b.Name);

  // STEP 2: start from an empty emulator and list the buckets. A new account has none.
  await resetEmulator();
  const before = await names();

  // STEP 3: create the bucket Daftar will use for its notes.
  // YOUR TURN start
  // HINT: client.send(new CreateBucketCommand({ Bucket: BUCKET }))
  // YOUR TURN end
  const during = await names();

  // STEP 4: delete it again. The account is empty once more.
  // YOUR TURN start
  // HINT: client.send(new DeleteBucketCommand({ Bucket: BUCKET }))
  // YOUR TURN end
  const after = await names();

  return {
    facts: [['Bucket name', BUCKET]],
    head: ['Moment', 'Buckets in the account'],
    rows: [
      ['before', before.join(', ') || '(none)'],
      ['after create', during.join(', ') || '(none)'],
      ['after delete', after.join(', ') || '(none)'],
    ],
  };
}

main(import.meta.url, run);
