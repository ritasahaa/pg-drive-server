import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  otpHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  used: { type: Boolean, default: false },
  usedAt: { type: Date },
  role: { type: String, default: 'user' }, // user, owner, admin
  purpose: { type: String, default: 'registration' },
  tenantId: { type: String, default: null },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Otp = mongoose.model('Otp', OtpSchema);
export default Otp;
