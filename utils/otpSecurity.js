import crypto from 'node:crypto';

const OTP_PATTERN = /^\d+$/;

export function normalizeOtpEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getOtpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OTP hash secret is not configured');
  }
  return secret;
}

export function generateOtp(length = 6) {
  if (!Number.isInteger(length) || length < 4 || length > 10) {
    throw new Error('OTP length must be between 4 and 10 digits');
  }

  const max = 10 ** length;
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

export function hashOtp(email, otp) {
  const normalizedEmail = normalizeOtpEmail(email);
  const normalizedOtp = String(otp || '').trim();
  if (!normalizedEmail || !OTP_PATTERN.test(normalizedOtp)) {
    throw new Error('Email and numeric OTP are required');
  }

  return crypto
    .createHmac('sha256', getOtpHashSecret())
    .update(`${normalizedEmail}:${normalizedOtp}`)
    .digest('hex');
}

export function verifyOtpHash(email, otp, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  try {
    const expectedHash = hashOtp(email, otp);
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(storedHash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
