import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { r2Client } from '../config/r2';
import { env } from '../config/env';

type UploadFileInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export async function uploadFile({ key, buffer, contentType }: UploadFileInput): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function deleteFile(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}

export function getPublicUrl(key: string): string {
  const publicUrl = env.R2_PUBLIC_URL.replace(/\/+$/, '');
  const objectKey = key.replace(/^\/+/, '');

  return `${publicUrl}/${objectKey}`;
}
