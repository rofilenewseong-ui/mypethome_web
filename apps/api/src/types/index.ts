import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Cafe24Profile {
  cafe24MemberId: string;
  email: string;
  name: string;
  phone?: string;
  hasAcrylicSet: boolean;
}

export type StorageProvider = 'local' | 's3';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
