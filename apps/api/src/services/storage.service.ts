import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { env } from '../config/env';
import { UploadResult } from '../types';
import { logger } from '../utils/logger';

class StorageService {
  private s3Client: S3Client | null = null;

  constructor() {
    if (env.STORAGE_PROVIDER === 's3') {
      this.s3Client = new S3Client({
        endpoint: env.S3_ENDPOINT || undefined,
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: true,
      });
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    folder: string,
    mimeType: string
  ): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const key = `${folder}/${crypto.randomUUID()}${ext}`;

    if (env.STORAGE_PROVIDER === 's3' && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      return {
        key,
        url: `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`,
        size: buffer.length,
        mimeType,
      };
    }

    // Firebase Storage fallback (서버리스 환경에서 로컬 저장 불가)
    try {
      const { fbStorage } = await import('../config/firebase');
      if (fbStorage) {
        const bucket = fbStorage.bucket();
        const file = bucket.file(key);
        await file.save(buffer, { contentType: mimeType, public: true });
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${key}`;
        logger.info(`Firebase Storage uploaded: ${key}`);
        return { key, url: publicUrl, size: buffer.length, mimeType };
      }
    } catch (fbErr) {
      logger.warn('Firebase Storage upload failed, trying local:', (fbErr as Error).message);
    }

    // Local storage (개발 환경)
    const uploadDir = path.resolve(process.cwd(), 'uploads', folder);
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.resolve(process.cwd(), 'uploads', key);
    await fs.writeFile(filePath, buffer);
    return {
      key,
      url: `/uploads/${key}`,
      size: buffer.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    try {
      if (env.STORAGE_PROVIDER === 's3' && this.s3Client) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
          })
        );
      } else {
        try {
          const { fbStorage } = await import('../config/firebase');
          if (fbStorage) {
            await fbStorage.bucket().file(key).delete();
            return;
          }
        } catch { /* fallthrough to local */ }
        const filePath = path.resolve(process.cwd(), 'uploads', key);
        await fs.unlink(filePath);
      }
    } catch (error) {
      logger.error(`Failed to delete file: ${key}`, error);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (env.STORAGE_PROVIDER === 's3' && this.s3Client) {
      return getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
        { expiresIn }
      );
    }
    return `/uploads/${key}`;
  }
}

export const storageService = new StorageService();
