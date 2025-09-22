import express from 'express';
import Stat from '../models/Stat.js';
import PG from '../models/PG.js';
import Bike from '../models/Bike.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// GET /api/stats - Get all main stats
router.get('/', async (req, res) => {
  try {
    // Real-time counts from collections
    const pgCount = await PG.countDocuments({ isDeleted: false });
    const bikeCount = await Bike.countDocuments({ isDeleted: false });
    const userCount = await User.countDocuments({ isDeleted: false });
    const bookingCount = await Booking.countDocuments({ isDeleted: false });

    res.json({
      pg: pgCount,
      bike: bikeCount,
      user: userCount,
      booking: bookingCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Stats fetch failed', details: err.message });
  }
});

export default router;
