import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  settingsVersion: { type: Number, default: 1 },
  settings: { type: Object },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Admin', AdminSchema);