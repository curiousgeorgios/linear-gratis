import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

function signatureDigest(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createWebhookSignature(body: string, secret: string): string {
  return `sha256=${signatureDigest(body, secret)}`;
}

export function verifyWebhookSignature(
  body: string,
  secret: string,
  headerValue: string | null,
): boolean {
  if (!headerValue) return false;

  const expected = createWebhookSignature(body, secret);
  return headerValue
    .split(',')
    .map((value) => value.trim())
    .some((signature) => constantTimeEquals(signature, expected));
}
