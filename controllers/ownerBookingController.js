import Booking from '../models/Booking.js';
import PG from '../models/PG.js';
import Bike from '../models/Bike.js';

// Get all bookings for owner's PGs and Bikes
export const getOwnerBookings = async (req, res) => {
  try {
    // Find PGs and Bikes owned by this owner
    const ownerId = req.user._id;
    const pgs = await PG.find({ owner: ownerId }, '_id');
    const bikes = await Bike.find({ owner_id: ownerId }, '_id');
    const pgIds = pgs.map(pg => pg._id);
    const bikeIds = bikes.map(bike => bike._id);

    // Find bookings for these PGs and Bikes
    const bookings = await Booking.find({
      $or: [
        { item_type: 'PG', item_id: { $in: pgIds } },
        { item_type: 'Bike', item_id: { $in: bikeIds } }
      ]
    }).populate('user_id', 'name email').sort({ created_at: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve/Reject booking
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
