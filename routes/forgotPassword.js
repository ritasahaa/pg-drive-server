import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import OTP from '../models/Otp.js';
// Enhanced Email System Import
import EmailManager from '../modules/email/EmailManager.js';
import { generateOtp, hashOtp, normalizeOtpEmail, verifyOtpHash } from '../utils/otpSecurity.js';
const router = express.Router();

// Forgot password endpoint - Send OTP
router.post('/', async (req, res) => {
  const { email, role } = req.body;
  const normalizedEmail = normalizeOtpEmail(email);
  try {
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ email: normalizedEmail, role });
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Generate OTP
    const otp = generateOtp(6);
    
    // Delete existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });
    
    // Create new OTP record
    const otpRecord = new OTP({
      email: normalizedEmail,
      otpHash: hashOtp(normalizedEmail, otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      verified: false,
      role: role || 'user',
      purpose: 'password-reset'
    });
    await otpRecord.save();
    
    // Send password reset OTP email using Enhanced Email Manager
    try {
      await EmailManager.sendOTPEmail(
        user, 
        otp, 
        'password reset',
        { useQueue: false } // High priority - immediate sending
      );
      
      res.json({ success: true, message: 'OTP sent to your email for password reset' });
    } catch (emailError) {
      await OTP.deleteOne({ _id: otpRecord._id });
      console.error('Password reset email delivery failed');
      res.status(502).json({ 
        success: false, 
        message: 'Failed to send OTP email. Please try again.' 
      });
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Reset password via OTP
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, otp, role } = req.body;
  const normalizedEmail = normalizeOtpEmail(email);
  try {
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ email: normalizedEmail, role });
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Find and verify OTP
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      role: role || 'user',
      purpose: 'password-reset',
      used: false
    }).sort({ createdAt: -1 }).select('+otpHash');
    if (!otpRecord) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (otpRecord.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });
    if (!verifyOtpHash(normalizedEmail, otp, otpRecord.otpHash)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    // Update password
    const bcrypt = await import('bcryptjs');
    if (role === 'admin') {
      user.password = await bcrypt.default.hash(newPassword, 10);
    } else {
      user.password_hash = await bcrypt.default.hash(newPassword, 10);
    }
    await user.save();
    
    // Mark OTP as verified and cleanup
    await OTP.deleteMany({ email: normalizedEmail });
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
