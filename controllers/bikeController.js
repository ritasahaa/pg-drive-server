import Bike from '../models/Bike.js';

// Get public bikes with advanced filtering
export const getPublicBikes = async (req, res) => {
  try {
    const { 
      search, 
      type, 
      fuelType, 
      city,
      limit = 12,
      page = 1,
      sort = 'created_at'
    } = req.query;

    // Build filter object
    let filter = { 
      status: 'approved', 
      softDelete: { $ne: true }, 
      available: true 
    };

    // Search functionality
    if (search) {
      filter.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Fuel type filter
    if (fuelType) {
      filter.fuelType = fuelType;
    }

    // Sorting
    let sortObj = {};
    switch (sort) {
      case 'price_low':
        sortObj = { price_per_day: 1 };
        break;
      case 'price_high':
        sortObj = { price_per_day: -1 };
        break;
      case 'rating':
        sortObj = { 'analytics.rating': -1 };
        break;
      case 'popular':
        sortObj = { 'analytics.views': -1 };
        break;
      default:
        sortObj = { price_per_day: 1 };
    }

    const bikes = await Bike.find(filter)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Bike.countDocuments(filter);

    res.json({
      bikes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get bike details for public view
export const getBikeDetails = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id)
      .populate('owner_id', 'name email phone')
      .lean();
    
    if (!bike || bike.status !== 'approved' || bike.softDelete) {
      return res.status(404).json({ error: 'Bike not found' });
    }

    // Increment view count
    await Bike.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.views': 1 }
    });

    res.json(bike);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Bike
export const createBike = async (req, res) => {
  try {
    const bike = new Bike({
      ...req.body,
      owner_id: req.user._id,
      status: 'pending',
      verificationStatus: 'pending',
      softDelete: false,
      analytics: { views: 0, bookings: 0 },
      created_at: new Date(),
      updated_at: new Date()
    });
    await bike.save();
    res.status(201).json(bike);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all bikes for owner (exclude soft deleted)
export const getOwnerBikes = async (req, res) => {
  try {
    const bikes = await Bike.find({ owner_id: req.user._id, softDelete: false });
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get bike by ID
export const getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findOne({ _id: req.params.id, owner_id: req.user._id, softDelete: false });
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    res.json(bike);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update bike
export const updateBike = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updated_at: new Date()
    };
    const bike = await Bike.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user._id, softDelete: false },
      updateData,
      { new: true }
    );
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    res.json(bike);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete bike (soft delete)
export const deleteBike = async (req, res) => {
  try {
    const bike = await Bike.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user._id, softDelete: false },
      { softDelete: true, status: 'deleted', updated_at: new Date() },
      { new: true }
    );
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    res.json({ message: 'Bike deleted', bike });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
