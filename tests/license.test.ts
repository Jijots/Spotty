import test from 'node:test';
import assert from 'node:assert/strict';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { checkLicense, describeLicense, fromBase64Url, LICENSE_PUBLIC_KEY } from '../src/lib/license';

ed.hashes.sha512 = sha512;

const b64u = (u8: Uint8Array) => Buffer.from(u8).toString('base64url');
const hexOf = (u8: Uint8Array) => Buffer.from(u8).toString('hex');
function makeKey(payload: object, secret: Uint8Array) {
  const body = new TextEncoder().encode(JSON.stringify(payload));
  return `${b64u(body)}.${b64u(ed.sign(body, secret))}`;
}

test('a signed key unlocks Pro, with or without an expiry', () => {
  const { secretKey, publicKey } = ed.keygen();
  const pub = hexOf(publicKey);
  const now = 2_000_000_000;
  const forever = checkLicense(makeKey({ v: 1, tier: 'pro', iat: now, name: 'Sam' }, secretKey), now, pub);
  assert.ok(forever.ok);
  if (forever.ok) {
    assert.equal(forever.expiresAt, null);
    assert.match(describeLicense(forever), /Sam.*never expires/);
  }
  const timed = checkLicense(makeKey({ v: 1, tier: 'pro', iat: now, exp: now + 86400 }, secretKey), now, pub);
  assert.ok(timed.ok && timed.expiresAt === now + 86400);
});

test('expired, tampered, forged and malformed keys are refused with a clear reason', () => {
  const { secretKey, publicKey } = ed.keygen();
  const other = ed.keygen();
  const pub = hexOf(publicKey);
  const now = 2_000_000_000;
  const key = makeKey({ v: 1, tier: 'pro', iat: now, exp: now + 10 }, secretKey);

  const expired = checkLicense(key, now + 11, pub);
  assert.ok(!expired.ok && expired.reason === 'expired');

  const [body, sig] = key.split('.');
  const evil = b64u(new TextEncoder().encode(JSON.stringify({ v: 1, tier: 'pro', iat: now })));
  const tampered = checkLicense(`${evil}.${sig}`, now, pub);
  assert.ok(!tampered.ok && tampered.reason === 'signature');

  const forged = checkLicense(makeKey({ v: 1, tier: 'pro', iat: now }, other.secretKey), now, pub);
  assert.ok(!forged.ok && forged.reason === 'signature');

  for (const bad of ['', '   ', 'abc', 'a.b.c', `${body}.zz`, '%%%.%%%']) {
    const r = checkLicense(bad, now, pub);
    assert.ok(!r.ok && (r.reason === 'empty' || r.reason === 'format'), bad);
  }

  // whitespace from copy and paste is ignored
  assert.ok(checkLicense(` ${body}\n.${sig} `, now - 5, pub).ok);

  // a newer payload version is refused politely
  const newer = checkLicense(makeKey({ v: 2, tier: 'pro', iat: now }, secretKey), now, pub);
  assert.ok(!newer.ok && newer.reason === 'unsupported');
});

test('base64url decoding matches Node and rejects junk', () => {
  for (const s of ['a', 'hello world', 'Hello, wörld ✓', 'x'.repeat(100)]) {
    const enc = Buffer.from(s).toString('base64url');
    assert.equal(Buffer.from(fromBase64Url(enc)!).toString(), s);
  }
  assert.equal(fromBase64Url('a'), null);
  assert.equal(fromBase64Url('ab+/'), null);
  assert.equal(LICENSE_PUBLIC_KEY.length, 64);
});
