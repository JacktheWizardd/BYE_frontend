/** Shared by the server and the explicitly invoked migration tool. Never log inputs. */
const encoder = new TextEncoder()
export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''
export const schoolEmail = (value: string) => /^[a-z0-9.!#$&'*/=?^_`{|}~-]+@go\.pasadena\.edu$/.test(value) && value.length <= 254
export function identitySecret(value: string | undefined): Uint8Array | null {
  if (!value || !/^[0-9a-f]{64}$/.test(value)) return null
  const bytes = Uint8Array.from(value.match(/../g)!, x => parseInt(x, 16))
  return new Set(bytes).size >= 16 ? bytes : null
}
export async function keyedDigest(secret: Uint8Array, purpose: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new Uint8Array(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`bye-review:v1:${purpose}:${value}`))))
}
export const mailboxDigest = (secret: Uint8Array, email: string) => keyedDigest(secret, 'mailbox', normalizeEmail(email))
export async function tokenDigest(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))))
}
export function randomToken(): string { return hex(crypto.getRandomValues(new Uint8Array(32))) }
export function randomCode(): string {
  // Rejection sampling avoids modulo bias.
  const n = new Uint32Array(1), ceiling = Math.floor(2 ** 32 / 1_000_000) * 1_000_000
  do { crypto.getRandomValues(n) } while (n[0] >= ceiling)
  return String(n[0] % 1_000_000).padStart(6, '0')
}
function hex(bytes: Uint8Array): string { return Array.from(bytes, x => x.toString(16).padStart(2,'0')).join('') }
