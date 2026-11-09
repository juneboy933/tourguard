import { randomBytes } from 'node:crypto';

export function createReference(prefix: string): string {
  return `${prefix}${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s().-]/g, '');
}
