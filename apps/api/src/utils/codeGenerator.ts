import crypto from 'crypto';

export function generateProductCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function formatCodeDisplay(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') || code;
}
