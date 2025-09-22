import express from 'express';
const router = express.Router();

// Simple mock offers endpoint for user dashboard
router.get('/', async (req, res) => {
  try {
    // Mock offers data for user dashboard
    const offers = [
      {
        id: 1,
        title: "Special Discount on PG Bookings",
        description: "Get 20% off on all PG bookings this month",
        discount: "20%",
        validUntil: "2025-08-31",
        type: "pg",
        active: true,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&h=200&fit=crop"
      },
      {
        id: 2,
        title: "Bike Rental Weekend Special",
        description: "Flat 15% off on weekend bike rentals",
        discount: "15%",
        validUntil: "2025-08-31",
        type: "bike",
        active: true,
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop"
      },
      {
        id: 3,
        title: "First Time User Bonus",
        description: "Get 25% off on your first booking",
        discount: "25%",
        validUntil: "2025-12-31",
        type: "both",
        active: true,
        imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=300&h=200&fit=crop"
      }
    ];
    
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
