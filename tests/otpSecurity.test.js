import test from 'node:test';
import assert from 'node:assert/strict';
import Otp from '../models/Otp.js';
import { generateOtp, hashOtp, verifyOtpHash } from '../utils/otpSecurity.js';

test('generateOtp returns a six-digit value', () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
});

test('OTP hashes verify without storing the plain OTP', () => {
  const previousSecret = process.env.OTP_HASH_SECRET;
  process.env.OTP_HASH_SECRET = 'unit-test-only-otp-secret-with-sufficient-length';
  const email = 'otp-test@example.com';
  const otp = '123456';
  try {
    const hash = hashOtp(email, otp);
    assert.notEqual(hash, otp);
    assert.equal(verifyOtpHash(email, otp, hash), true);
    assert.equal(verifyOtpHash(email, '654321', hash), false);
  } finally {
    if (previousSecret === undefined) delete process.env.OTP_HASH_SECRET;
    else process.env.OTP_HASH_SECRET = previousSecret;
  }
});

test('OTP model stores only a non-selected hash', () => {
  assert.equal(Otp.schema.path('otp'), undefined);
  assert.equal(Otp.schema.path('otpHash').options.required, true);
  assert.equal(Otp.schema.path('otpHash').options.select, false);
});
