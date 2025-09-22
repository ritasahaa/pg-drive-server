import mongoose from 'mongoose';

const BikeSchema = new mongoose.Schema({
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerProfile', required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, enum: ['Standard', 'Sports', 'Scooter', 'Electric'], default: 'Standard' },
  year: { type: Number },
  color: { type: String },
  cc: { type: Number }, // Engine capacity
  mileage: { type: Number },
  fuelType: { type: String, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], default: 'Petrol' },
  transmission: { type: String, enum: ['Manual', 'Automatic'], default: 'Manual' },
  number_plate: { type: String, required: true },
  registration_docs: [{ type: String }], // URLs or file references
  insurance: {
    provider: { type: String },
    policyNumber: { type: String },
    validTill: { type: Date }
  },
  price_per_day: { type: Number, required: true },
  originalPrice: { type: Number }, // For discount calculation
  price_per_week: { type: Number },
  price_per_month: { type: Number },
  available: { type: Boolean, default: true },
  description: { type: String },
  images: [{ type: String }],
  features: [{ type: String }],
  analytics: {
    views: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }
  },
  location: {
    city: { type: String },
    state: { type: String },
    area: { type: String },
    address: { type: String }, // Full address field
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'deleted'], default: 'pending' },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  approvalLogs: [{
    date: { type: Date, default: Date.now },
    status: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    remarks: { type: String }
  }],
  softDelete: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('Bike', BikeSchema);
