import Booking from '../models/Booking.js';
import PG from '../models/PG.js';
import Bike from '../models/Bike.js';

// Get revenue breakdown for owner's PGs and Bikes (industry-level)
export const getOwnerRevenue = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const pgs = await PG.find({ owner: ownerId }, '_id name rooms availableRooms');
    const bikes = await Bike.find({ owner_id: ownerId }, '_id brand model type');
    const pgIds = pgs.map(pg => pg._id);
    const bikeIds = bikes.map(bike => bike._id);

    // Get bookings for PGs and Bikes
    const pgBookings = await Booking.find({ item_type: 'PG', item_id: { $in: pgIds }, status: { $in: ['confirmed', 'completed'] } });
    const bikeBookings = await Booking.find({ item_type: 'Bike', item_id: { $in: bikeIds }, status: { $in: ['confirmed', 'completed'] } });

    // Calculate revenue
    const pgRevenue = pgBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const bikeRevenue = bikeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalRevenue = pgRevenue + bikeRevenue;

    // Monthly breakdown
    const monthly = {};
    [...pgBookings, ...bikeBookings].forEach(b => {
      const month = new Date(b.from_date).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthly[month] = (monthly[month] || 0) + (b.amount || 0);
    });

    // Top earning PG/Bike
    const pgEarnings = {};
    pgBookings.forEach(b => {
      pgEarnings[b.item_id] = (pgEarnings[b.item_id] || 0) + (b.amount || 0);
    });
    const topPG = Object.entries(pgEarnings).sort((a, b) => b[1] - a[1])[0];
    const topPGObj = topPG ? pgs.find(pg => pg._id.equals(topPG[0])) : null;

    const bikeEarnings = {};
    bikeBookings.forEach(b => {
      bikeEarnings[b.item_id] = (bikeEarnings[b.item_id] || 0) + (b.amount || 0);
    });
    const topBike = Object.entries(bikeEarnings).sort((a, b) => b[1] - a[1])[0];
    const topBikeObj = topBike ? bikes.find(bike => bike._id.equals(topBike[0])) : null;

    // Occupancy rate (PG)
    const occupancyRates = pgs.map(pg => {
      const totalRooms = pg.rooms || 0;
      const bookedRooms = pg.availableRooms ? totalRooms - pg.availableRooms : 0;
      return {
        pgId: pg._id,
        name: pg.name,
        occupancy: totalRooms ? Math.round((bookedRooms / totalRooms) * 100) : 0
      };
    });

    // Payment method breakdown (if available)
    // For demo, assume Booking has paymentMethod field
    const paymentBreakdown = {};
    [...pgBookings, ...bikeBookings].forEach(b => {
      const method = b.paymentMethod || 'Unknown';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (b.amount || 0);
    });

    // Trend data (last 6 months)
    const now = new Date();
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      trend.push({
        month: key,
        revenue: monthly[key] || 0
      });
    }

    res.json({
      totalRevenue,
      pgRevenue,
      bikeRevenue,
      monthlyBreakdown: monthly,
      topPG: topPGObj ? { name: topPGObj.name, revenue: topPG[1] } : null,
      topBike: topBikeObj ? { brand: topBikeObj.brand, model: topBikeObj.model, type: topBikeObj.type, revenue: topBike[1] } : null,
      occupancyRates,
      paymentBreakdown,
      trend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
