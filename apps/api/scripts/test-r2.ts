import { deleteFile, uploadFile } from '../src/services/storage.service';

const key = `__r2-connection-test__/${crypto.randomUUID()}.txt`;
let uploaded = false;

try {
  await uploadFile({
    key,
    buffer: Buffer.from('AliTracker R2 connection test', 'utf8'),
    contentType: 'text/plain',
  });
  uploaded = true;

  console.info(`R2 connection verified: uploaded ${key}`);
} finally {
  if (uploaded) {
    await deleteFile(key);
    console.info(`R2 test file deleted: ${key}`);
  }
}
