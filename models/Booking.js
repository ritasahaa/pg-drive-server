import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item_type: { type: String, enum: ['PG', 'Bike'], required: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  amount: { type: Number },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', BookingSchema);
