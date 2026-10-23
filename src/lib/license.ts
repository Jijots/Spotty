// Offline Pro license check. A key is two base64url parts joined by a dot: a small JSON payload and an
// ed25519 signature of that payload. The app holds only the PUBLIC key, so it can tell a real key from a forged
// one but cannot make keys. No server, no account. The source is open, so a determined person could remove this
// check; it exists to thank supporters, not to lock anyone out.

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

ed.hashes.sha512 = sha512;

/** The matching private key is kept outside the repo; see scripts/license.mjs. */
export const LICENSE_PUBLIC_KEY = '44edfb07862c986e608ba0221a424be1bf5834b6419adcc8dd7968915a371ab3';

export interface LicensePayload { v: 1; tier: 'pro'; iat: number; exp?: number; name?: string }
export type LicenseCheck =
  | { ok: true; payload: LicensePayload; expiresAt: number | null }
  | { ok: false; reason: 'empty' | 'format' | 'signature' | 'expired' | 'unsupported'; message: string };

const MESSAGES = {
  empty: 'Paste your license key.',
  format: "That doesn't look like a Spotty license key. Copy the whole thing, with no spaces.",
  signature: "This key isn't valid. Check you copied all of it, or ask for a new one.",
  expired: 'This key has expired. Ask for a new one.',
  unsupported: 'This key is from a newer version of Spotty. Update the app and try again.',
} as const;

const fail = (reason: keyof typeof MESSAGES): LicenseCheck => ({ ok: false, reason, message: MESSAGES[reason] });

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url -> bytes without Buffer or atob, which are not on every runtime. Returns null for bad input. */
export function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) return null;
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const ch of s) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); acc &= (1 << bits) - 1; }
  }
  return Uint8Array.from(out);
}

const fromHex = (h: string) => Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16)));

/** UTF-8 bytes -> string, or null if they are not valid text. */
function utf8(u8: Uint8Array): string | null {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch { return null; }
}

/** Checks a pasted key against a public key (hex) at a given time (epoch seconds). */
export function checkLicense(raw: string, nowSec = Math.floor(Date.now() / 1000), publicKeyHex = LICENSE_PUBLIC_KEY): LicenseCheck {
  const key = raw.replace(/\s+/g, '');
  if (!key) return fail('empty');
  const parts = key.split('.');
  if (parts.length !== 2) return fail('format');
  const body = fromBase64Url(parts[0]);
  const sig = fromBase64Url(parts[1]);
  if (!body || !sig || sig.length !== 64) return fail('format');

  let valid = false;
  try { valid = ed.verify(sig, body, fromHex(publicKeyHex)); } catch { valid = false; }
  if (!valid) return fail('signature');

  const json = utf8(body);
  let p: unknown = null;
  try { p = json ? JSON.parse(json) : null; } catch { p = null; }
  if (typeof p !== 'object' || p === null) return fail('format');
  const o = p as Record<string, unknown>;
  if (o.v !== 1 || o.tier !== 'pro' || typeof o.iat !== 'number') return fail('unsupported');
  const exp = typeof o.exp === 'number' ? o.exp : undefined;
  if (exp !== undefined && exp <= nowSec) return fail('expired');
  const payload: LicensePayload = {
    v: 1, tier: 'pro', iat: o.iat,
    ...(exp !== undefined ? { exp } : {}),
    ...(typeof o.name === 'string' ? { name: o.name } : {}),
  };
  return { ok: true, payload, expiresAt: exp ?? null };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Pro is active until 3 Mar 2027." or "Pro is active. This key never expires." */
export function describeLicense(c: Extract<LicenseCheck, { ok: true }>): string {
  const who = c.payload.name ? ` for ${c.payload.name}` : '';
  if (c.expiresAt === null) return `Pro is active${who}. This key never expires.`;
  const d = new Date(c.expiresAt * 1000);
  return `Pro is active${who} until ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;
}
