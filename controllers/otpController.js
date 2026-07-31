
import Otp from '../models/Otp.js';
import User from '../models/User.js';
import OwnerProfile from '../models/OwnerProfile.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Enhanced Email System Import
import EmailManager from '../modules/email/EmailManager.js';
import OtpAudit from '../models/OtpAudit.js';
import axios from 'axios';
import Settings from '../models/Settings.js';
import { generateOtp, hashOtp, normalizeOtpEmail, verifyOtpHash } from '../utils/otpSecurity.js';

// Helper: Audit log
async function logOtpAction(email, action, status, message, req) {
  if (!email) return;
  try {
    await OtpAudit.create({
      email,
      action,
      status,
      message,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
    });
  } catch {
    console.error('OTP audit logging failed');
  }
}

// Helper: Rate limit (role-based limits per hour)
async function isRateLimited(email, role = 'user') {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await OtpAudit.countDocuments({
    email,
    action: { $in: ['send', 'resend'] },
    status: 'success',
    createdAt: { $gte: oneHourAgo }
  });
  
  // Role-based rate limits
  let maxLimit;
  switch (role) {
    case 'admin':
      maxLimit = 10; // Admin: 10 OTP per hour
      break;
    case 'owner':
      maxLimit = 5;  // Owner: 5 OTP per hour
      break;
    case 'user':
    default:
      maxLimit = 5;  // User: 5 OTP per hour
      break;
  }
  
  return count >= maxLimit;
}

// Helper: Get versioned settings (OTP length, expiry, retry)
async function getOtpSettings() {
  // Settings model se fetch karo, fallback default
  const settings = await Settings.findOne({ key: 'otp' });
  return {
    length: 6,
    expiry: settings?.value?.expiry || 5 * 60, // seconds
    retryLimit: settings?.value?.retryLimit || 3,
    webhookUrl: settings?.value?.webhookUrl || '',
  };
}

// Helper: GDPR/Data Consent log
async function logConsent(email, consentType, details) {
  // Consent model me save karo
  // ...implementation...
}

// Helper: Multi-tenancy (tenantId support)
function getTenantId(req) {
  return req.headers['x-tenant-id'] || null;
}

// Helper: Analytics log
async function logAnalytics(email, action, status) {
  // Analytics model me save karo
  // ...implementation...
}

async function sendOtp(req, res) {
  const { email, role, purpose = 'registration' } = req.body;
  const userRole = role || 'user'; // Default to 'user' if role not provided
  const normalizedEmail = normalizeOtpEmail(email);
  const tenantId = getTenantId(req);
  
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  const otpSettings = await getOtpSettings();

  // Note: Email existence check is now done separately via /check-email endpoint
  // This allows for better UX where users get immediate feedback before OTP is sent
  
  if (await isRateLimited(normalizedEmail, userRole)) {
    const limits = { user: 5, owner: 5, admin: 10 };
    const maxLimit = limits[userRole] || 5;
    await logOtpAction(normalizedEmail, 'send', 'error', 'Rate limit exceeded', req);
    return res.status(429).json({ 
      success: false, 
      message: `Too many OTP requests. Maximum ${maxLimit} OTPs per hour allowed for ${userRole}s.` 
    });
  }
  
  const otp = generateOtp(otpSettings.length);
  const expiresAt = new Date(Date.now() + otpSettings.expiry * 1000);
  await Otp.deleteMany({ email: normalizedEmail });
  const otpRecord = await Otp.create({
    email: normalizedEmail,
    otpHash: hashOtp(normalizedEmail, otp),
    expiresAt,
    tenantId,
    role: userRole,
    purpose
  });
  
  // Send OTP email using Enhanced Email Manager
  try {
    await EmailManager.sendOTPEmail(
      { email: normalizedEmail, name: 'User' }, 
      otp, 
      'email verification',
      { useQueue: false } // High priority - immediate sending
    );
    
    await logOtpAction(normalizedEmail, 'send', 'success', 'OTP sent successfully', req);
    return res.json({ success: true, message: 'OTP sent successfully' });
    
  } catch (emailError) {
    await Otp.deleteOne({ _id: otpRecord._id });
    await logOtpAction(normalizedEmail, 'send', 'email_failed', 'Email delivery failed', req);
    return res.status(502).json({ 
      success: false, 
      message: 'Failed to send OTP email. Please try again.'
    });
  }
};

async function verifyOtp(req, res) {
  const { email, otp, role = 'user', purpose = 'registration' } = req.body;
  const normalizedEmail = normalizeOtpEmail(email);
  const tenantId = getTenantId(req);
  if (!normalizedEmail || !/^\d{6}$/.test(String(otp || ''))) {
    return res.status(400).json({ success: false, message: 'Email and a valid 6-digit OTP are required' });
  }

  const otpSettings = await getOtpSettings();
  const record = await Otp.findOne({
    email: normalizedEmail,
    tenantId,
    role,
    purpose,
    used: false
  }).sort({ createdAt: -1 }).select('+otpHash');
  if (!record) {
    await logOtpAction(normalizedEmail, 'verify', 'error', 'Invalid OTP', req);
    await logAnalytics(normalizedEmail, 'verify', 'error');
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
  if (record.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: record._id });
    await logOtpAction(normalizedEmail, 'verify', 'error', 'OTP expired', req);
    await logAnalytics(normalizedEmail, 'verify', 'error');
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (!verifyOtpHash(normalizedEmail, otp, record.otpHash)) {
    record.attempts += 1;
    if (record.attempts >= otpSettings.retryLimit) {
      await Otp.deleteOne({ _id: record._id });
    } else {
      await record.save();
    }
    await logOtpAction(normalizedEmail, 'verify', 'error', 'Invalid OTP', req);
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  record.verified = true;
  // Don't mark as used here - will be marked when used for registration
  await record.save();
  await logOtpAction(normalizedEmail, 'verify', 'success', 'OTP verified', req);
  await logAnalytics(normalizedEmail, 'verify', 'success');
  // Webhook trigger
  if (otpSettings.webhookUrl) {
    axios.post(otpSettings.webhookUrl, { email: normalizedEmail, tenantId, event: 'otp_verified', time: new Date() }).catch(() => {});
  }
  res.json({ success: true, message: 'OTP verified' });
};

async function resendOtp(req, res) {
  const { email, role, purpose = 'registration' } = req.body;
  const userRole = role || 'user'; // Default to 'user' if role not provided
  const normalizedEmail = normalizeOtpEmail(email);
  const tenantId = getTenantId(req);
  
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  const otpSettings = await getOtpSettings();
  
  if (await isRateLimited(normalizedEmail, userRole)) {
    const limits = { user: 5, owner: 5, admin: 10 };
    const maxLimit = limits[userRole] || 5;
    await logOtpAction(normalizedEmail, 'resend', 'error', 'Rate limit exceeded', req);
    return res.status(429).json({ 
      success: false, 
      message: `Too many OTP requests. Maximum ${maxLimit} OTPs per hour allowed for ${userRole}s.` 
    });
  }
  
  const otp = generateOtp(otpSettings.length);
  const expiresAt = new Date(Date.now() + otpSettings.expiry * 1000);
  await Otp.deleteMany({ email: normalizedEmail });
  const otpRecord = await Otp.create({
    email: normalizedEmail,
    otpHash: hashOtp(normalizedEmail, otp),
    expiresAt,
    tenantId,
    role: userRole,
    purpose
  });
  
  // Send OTP email using Enhanced Email Manager
  try {
    await EmailManager.sendOTPEmail(
      { email: normalizedEmail, name: 'User' }, 
      otp, 
      'OTP resend request',
      { useQueue: false } // High priority - immediate sending
    );
    
    await logOtpAction(normalizedEmail, 'resend', 'success', 'OTP resent', req);
    await logAnalytics(normalizedEmail, 'resend', 'success');
    res.json({ success: true, message: 'OTP resent' });
    
  } catch (emailError) {
    await Otp.deleteOne({ _id: otpRecord._id });
    await logOtpAction(normalizedEmail, 'resend', 'email_failed', 'Email delivery failed', req);
    res.status(502).json({ 
      success: false,
      message: 'Failed to resend OTP email. Please try again.' 
    });
  }
};

// Check if email already exists for registration
async function checkEmailExists(req, res) {
  const { email, role } = req.body;
  const userRole = role || 'user';
  const normalizedEmail = normalizeOtpEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  try {
    let existingUser = null;
    
    // Check based on role
    if (userRole === 'owner') {
      // For owners, check both User table (with role='owner') and OwnerProfile table
      existingUser = await User.findOne({ email: normalizedEmail, role: 'owner' }) || 
                     await OwnerProfile.findOne({ email: normalizedEmail });
    } else {
      // For users and admins, check User table
      existingUser = await User.findOne({ email: normalizedEmail, role: userRole });
    }
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: `This email is already registered as ${userRole}. Please try logging in instead.`,
        alreadyRegistered: true,
        exists: true
      });
    }

    // Email is available for registration
    return res.json({ 
      success: true, 
      message: 'Email is available for registration',
      exists: false
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking email availability' 
    });
  }
}

// Cleanup expired OTPs (background job)
async function cleanupExpiredOtps() {
  await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
}

export default {
  sendOtp,
  verifyOtp,
  resendOtp,
  checkEmailExists,
  cleanupExpiredOtps
};
