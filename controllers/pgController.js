// Enhanced PG Controller with Industry-Level Features
import PG from '../models/PG.js';

// Create a new PG with enhanced validation
export const createPG = async (req, res) => {
  try {
    const pgData = {
      ...req.body,
      owner: req.user._id,
      status: 'pending',
      verificationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Auto-generate SEO data if not provided
    if (!pgData.seo?.slug) {
      const slug = pgData.name.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/ +/g, '-');
      pgData.seo = {
        ...pgData.seo,
        slug: `${slug}-${pgData.city.toLowerCase()}`
      };
    }

    const pg = new PG(pgData);
    await pg.save();
    
    res.status(201).json({
      success: true,
      message: 'PG created successfully',
      data: pg
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get all PGs with advanced filtering and pagination
export const getAllPGs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      city, 
      state, 
      priceMin, 
      priceMax, 
      pgType, 
      genderAllowed,
      amenities,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { 
      status: 'active',
      softDelete: { $ne: true }
    };

    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseInt(priceMin);
      if (priceMax) filter.price.$lte = parseInt(priceMax);
    }
    if (pgType) filter.pgType = pgType;
    if (genderAllowed) filter.genderAllowed = genderAllowed;
    if (featured) filter.featured = featured === 'true';
    if (amenities) {
      const amenityList = amenities.split(',');
      filter.amenities = { $in: amenityList };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pgs = await PG.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PG.countDocuments(filter);

    res.json({
      success: true,
      data: pgs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error in getAllPGs:', err);
    res.status(500).json({ 
      success: false,
      error: err.message
    });
  }
};

// Get all PGs for an owner with analytics
export const getOwnerPGs = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { owner: ownerId, softDelete: false };
    if (status) filter.status = status;

    const pgs = await PG.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Calculate analytics
    const analytics = await PG.aggregate([
      { $match: { owner: ownerId, softDelete: false } },
      {
        $group: {
          _id: null,
          totalPGs: { $sum: 1 },
          activePGs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalViews: { $sum: '$analytics.views' },
          totalInquiries: { $sum: '$analytics.inquiries' },
          totalBookings: { $sum: '$analytics.bookings' },
          averageRating: { $avg: '$rating.overall' },
          totalRooms: { $sum: '$rooms' },
          totalAvailableRooms: { $sum: '$availableRooms' }
        }
      }
    ]);

    res.json({
      success: true,
      data: pgs,
      analytics: analytics[0] || {
        totalPGs: 0,
        activePGs: 0,
        totalViews: 0,
        totalInquiries: 0,
        totalBookings: 0,
        averageRating: 0,
        totalRooms: 0,
        totalAvailableRooms: 0
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get single PG by ID with view tracking
export const getPGById = async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id)
      .populate('owner', 'name email contactNumber');
    
    if (!pg || pg.softDelete) {
      return res.status(404).json({ 
        success: false,
        error: 'PG not found' 
      });
    }

    // Increment view count
    await PG.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.views': 1 }
    });

    res.json({
      success: true,
      data: pg
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get PG by slug for SEO-friendly URLs
export const getPGBySlug = async (req, res) => {
  try {
    const pg = await PG.findOne({ 
      'seo.slug': req.params.slug, 
      status: 'active',
      softDelete: false,
      verificationStatus: 'verified'
    }).populate('owner', 'name email contactNumber');
    
    if (!pg) {
      return res.status(404).json({ 
        success: false,
        error: 'PG not found' 
      });
    }

    // Increment view count
    await PG.findOneAndUpdate(
      { 'seo.slug': req.params.slug },
      { $inc: { 'analytics.views': 1 } }
    );

    res.json({
      success: true,
      data: pg
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update PG with enhanced validation
export const updatePG = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const pg = await PG.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!pg || pg.softDelete) {
      return res.status(404).json({ 
        success: false,
        error: 'PG not found' 
      });
    }

    res.json({
      success: true,
      message: 'PG updated successfully',
      data: pg
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Soft delete PG
export const deletePG = async (req, res) => {
  try {
    const pg = await PG.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { softDelete: true, updatedAt: new Date() },
      { new: true }
    );
    
    if (!pg) {
      return res.status(404).json({ 
        success: false,
        error: 'PG not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'PG deleted successfully' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Search PGs with advanced filters
export const searchPGs = async (req, res) => {
  try {
    const { 
      q, // search query
      location,
      radius = 10, // km
      lat,
      lng
    } = req.query;

    let filter = { 
      status: 'active', 
      softDelete: false,
      verificationStatus: 'verified'
    };

    // Text search
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { city: new RegExp(q, 'i') },
        { state: new RegExp(q, 'i') },
        { amenities: { $in: [new RegExp(q, 'i')] } },
        { highlights: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Location-based search
    if (lat && lng) {
      filter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius) * 1000 // Convert km to meters
        }
      };
    }

    const pgs = await PG.find(filter)
      .sort({ featured: -1, 'rating.overall': -1 })
      .limit(50);

    res.json({
      success: true,
      data: pgs,
      total: pgs.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get featured PGs
export const getFeaturedPGs = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const pgs = await PG.find({
      featured: true,
      status: 'active',
      softDelete: false,
      verificationStatus: 'verified'
    })
    .sort({ 'rating.overall': -1, updatedAt: -1 })
    .limit(parseInt(limit))
    .populate('owner', 'name email contactNumber');

    res.json({
      success: true,
      data: pgs
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Track PG inquiry
export const trackInquiry = async (req, res) => {
  try {
    await PG.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.inquiries': 1 }
    });

    res.json({
      success: true,
      message: 'Inquiry tracked successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
