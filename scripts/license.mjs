// Issues Spotty Pro license keys. Keys are signed with a private key that lives OUTSIDE this repo.
//
//   node scripts/license.mjs keygen --out D:/gym-build/keystore/license-private.key
//       Creates the signing key once and prints the public key to paste into src/lib/license.ts.
//
//   node scripts/license.mjs issue --key D:/gym-build/keystore/license-private.key --name "Sam" --days 365
//       Prints a license key for one supporter. Leave out --days for a key that never expires.
//
// Anyone can read this script; only the private key can make valid keys. Back that key up and never commit it.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

ed.hashes.sha512 = sha512;

const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const hex = (u8) => Buffer.from(u8).toString('hex');
const unhex = (s) => Uint8Array.from(Buffer.from(s.trim(), 'hex'));
const b64url = (u8) => Buffer.from(u8).toString('base64url');

const cmd = process.argv[2];

if (cmd === 'keygen') {
  const out = arg('out');
  if (!out) { console.error('Usage: keygen --out <file>'); process.exit(1); }
  if (existsSync(out)) { console.error(`Refusing to overwrite ${out}. Delete it yourself if you really mean to replace the key (old licenses stop working).`); process.exit(1); }
  const { secretKey, publicKey } = ed.keygen();
  writeFileSync(out, hex(secretKey) + '\n');
  console.log('Private key written to', out);
  console.log('Public key (paste into src/lib/license.ts):');
  console.log(hex(publicKey));
} else if (cmd === 'issue') {
  const keyFile = arg('key');
  if (!keyFile) { console.error('Usage: issue --key <private key file> [--name <who>] [--days <n>]'); process.exit(1); }
  const secretKey = unhex(readFileSync(keyFile, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const days = arg('days');
  const payload = { v: 1, tier: 'pro', iat: now };
  if (arg('name')) payload.name = arg('name').slice(0, 40);
  if (days) payload.exp = now + Math.round(Number(days) * 86400);
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const sig = ed.sign(body, secretKey);
  const key = `${b64url(body)}.${b64url(sig)}`;
  console.log(key);
  console.error(days ? `\nExpires in ${days} days.` : '\nNever expires.');
} else {
  console.error('Commands: keygen, issue');
  process.exit(1);
}
