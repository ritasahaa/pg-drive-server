// analyticsController.js
// Controller for user advanced analytics

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    // Total bookings
    const totalBookings = await Booking.countDocuments({ user: userId });
    // Total amount spent
    const payments = await Payment.find({ user: userId, status: 'success', isDeleted: false });
    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
    // Average rating given
    const reviews = await Review.find({ user: userId });
    const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;
    // Most booked bike/PG (example)
    const bookings = await Booking.find({ user: userId }).populate('bike pg');
    const bikeCount = {};
    const pgCount = {};
    bookings.forEach(b => {
      if (b.bike) bikeCount[b.bike._id] = (bikeCount[b.bike._id] || 0) + 1;
      if (b.pg) pgCount[b.pg._id] = (pgCount[b.pg._id] || 0) + 1;
    });
    const mostBookedBike = Object.keys(bikeCount).length ? Object.entries(bikeCount).sort((a,b)=>b[1]-a[1])[0][0] : null;
    const mostBookedPG = Object.keys(pgCount).length ? Object.entries(pgCount).sort((a,b)=>b[1]-a[1])[0][0] : null;
    res.json({
      success: true,
      analytics: {
        totalBookings,
        totalSpent,
        avgRating,
        mostBookedBike,
        mostBookedPG
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
