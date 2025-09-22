import express from 'express';
import Bike from '../models/Bike.js';
import {
  createBike,
  getOwnerBikes,
  getBikeById,
  updateBike,
  deleteBike,
  getPublicBikes,
  getBikeDetails
} from '../controllers/bikeController.js';
import { ownerAuth } from '../middleware/auth.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogService.js';

const router = express.Router();

// Public routes (must come first to avoid conflicts)
router.get('/public', getPublicBikes);
router.get('/public/:id', getBikeDetails);

// Public random bikes for homepage/listing
router.get('/random', async (req, res) => {
  try {
    // 8 random approved & available bikes
    const bikes = await Bike.aggregate([
      { $match: { status: 'approved', softDelete: { $ne: true }, available: true } },
      { $sample: { size: 8 } }
    ]);
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public listing for all users
router.get('/', async (req, res) => {
  try {
    const bikes = await Bike.find({ status: 'approved', softDelete: { $ne: true }, available: true });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner Bike CRUD routes
router.post('/', ownerAuth, createBike);
router.get('/owner', ownerAuth, getOwnerBikes);

// Advanced bike search/filter endpoint
router.post('/search', async (req, res) => {
  const { query, filters, sort, page, limit } = req.body;
  try {
    const bikes = await Bike.aggregate([
      { $match: filters || {} },
      { $sort: sort || { createdAt: -1 } },
      { $skip: ((page || 1) - 1) * (limit || 20) },
      { $limit: limit || 20 },
    ]);
    res.status(200).json({ success: true, bikes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protected routes (with specific IDs - must come after general routes)
router.get('/:id', async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    res.json(bike);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', ownerAuth, updateBike);
router.delete('/:id', ownerAuth, deleteBike);

export default router;
