import express from 'express';
import HeroContent from '../models/HeroContent.js';
import MarketingStat from '../models/MarketingStat.js';
import FeaturedListing from '../models/FeaturedListing.js';
import Testimonial from '../models/Testimonial.js';
import CTAContent from '../models/CTAContent.js';
import FooterContent from '../models/FooterContent.js';
import FeatureContent from '../models/FeatureContent.js';
import PG from '../models/PG.js';
import Bike from '../models/Bike.js';

const router = express.Router();

// GET /api/home - Get all home page content
router.get('/', async (req, res) => {
  try {
    const hero = await HeroContent.findOne({ isDeleted: false });
    
    // Get dynamic marketing stats from database
    const marketingStats = await MarketingStat.find({ 
      isDeleted: false, 
      isActive: true 
    }).sort({ order: 1 });

    // Random PGs (limited info for public)
    const randomPGs = await PG.aggregate([
      { $match: { status: 'active', softDelete: { $ne: true } } },
      { $sample: { size: 4 } },
      {
        $project: {
          name: 1,
          city: 1,
          state: 1,
          price: 1,
          images: { $slice: ['$images', 1] },
          rating: 1
        }
      }
    ]);

    // Random Bikes (limited info for public)
    const randomBikes = await Bike.aggregate([
      { $match: { status: 'approved', softDelete: { $ne: true }, available: true } },
      { $sample: { size: 4 } },
      {
        $project: {
          brand: 1,
          model: 1,
          type: 1,
          color: 1,
          price_per_day: 1,
          images: { $slice: ['$images', 1] },
          rating: 1
        }
      }
    ]);

    const testimonials = await Testimonial.find({ isDeleted: false }).limit(6);
    const cta = await CTAContent.findOne({ isDeleted: false });
    
    // Section Headers - Dynamic content for all section titles and subtitles
    const sectionHeaders = {
      stats: {
        title: "Our Achievements",
        subtitle: "Numbers that speak for our commitment to excellence"
      },
      pgs: {
        title: "PGs For You",
        subtitle: "Discover comfortable and affordable PG accommodations tailored just for you"
      },
      bikes: {
        title: "Bikes For You", 
        subtitle: "Find the perfect bike for your daily commute or weekend adventures"
      },
      testimonials: {
        title: "What Our Users Say",
        subtitle: "Real experiences from our satisfied customers who found their perfect PG and bike"
      },
      features: {
        title: "Why Choose Our Platform",
        subtitle: "Experience the best in PG accommodations and bike rentals with our comprehensive platform"
      }
    };
    
    // Features/Marketing content - try to get from database first
    let features = await FeatureContent.findOne({ 
      isActive: true, 
      isDeleted: false 
    }).sort({ createdAt: -1 });
    
    // If no features found in database, use default
    if (!features) {
      features = {
        title: "Why Choose Our Platform",
        subtitle: "Experience the best in PG accommodations and bike rentals with our comprehensive platform",
        ctaText: "Start Your Journey Today",
        items: [
          {
            icon: 'home',
            color: 'blue',
            title: 'Verified PGs',
            description: 'All our PG accommodations are verified and inspected for quality, safety, and cleanliness standards.'
          },
          {
            icon: 'bicycle',
            color: 'purple',
            title: 'Premium Bikes',
            description: 'Well-maintained bikes with regular servicing, insurance coverage, and 24/7 roadside assistance.'
          },
          {
            icon: 'credit-card',
            color: 'green',
            title: 'Secure Payments',
            description: 'Safe and secure payment gateway with multiple payment options and instant booking confirmation.'
          },
          {
            icon: 'star',
            color: 'orange',
            title: 'Best Prices',
            description: 'Competitive pricing with no hidden charges, transparent billing, and flexible payment plans.'
          },
          {
            icon: 'lock',
            color: 'pink',
            title: 'Safe & Secure',
            description: 'Advanced security measures, background-verified owners, and comprehensive safety protocols.'
          },
          {
            icon: 'mobile',
            color: 'cyan',
            title: 'Easy Booking',
            description: 'Simple and intuitive booking process with instant confirmation and easy cancellation policies.'
          }
        ]
      };
    } else {
      // Sort active items by order
      if (features.items) {
        features.items = features.items
          .filter(item => item.isActive)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
    
    res.json({ 
      hero, 
      stats: marketingStats, 
      featuredPGs: randomPGs, 
      featuredBikes: randomBikes, 
      testimonials, 
      cta,
      features,
      sectionHeaders,
      success: true,
      type: 'public'
    });
  } catch (err) {
    res.status(500).json({ error: 'Home content fetch failed', details: err.message });
  }
});

export default router;
