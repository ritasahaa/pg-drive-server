import Booking from '../models/Booking.js';
import PG from '../models/PG.js';
import Bike from '../models/Bike.js';
import Revenue from '../models/Invoice.js';

// Get advanced analytics for owner
export const getOwnerAnalytics = async (req, res) => {
  try {
    const ownerId = req.user._id;
    // PG/Bike counts
    const pgCount = await PG.countDocuments({ owner: ownerId });
    const bikeCount = await Bike.countDocuments({ owner: ownerId });
    // Booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { owner: ownerId } },
      { $group: {
        _id: { status: '$status' },
        count: { $sum: 1 }
      }}
    ]);
    // Revenue stats
    const revenueStats = await Revenue.aggregate([
      { $match: { owner: ownerId } },
      { $group: {
        _id: null,
        total: { $sum: '$amount' },
        avg: { $avg: '$amount' }
      }}
    ]);
    res.json({ pgCount, bikeCount, bookingStats, revenueStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
