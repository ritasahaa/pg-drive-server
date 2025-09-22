import express from 'express';
const router = express.Router();

// Demo data for About page
const aboutData = {
  hero: {
    title: 'About Us',
    subtitle: 'Our Story',
    description: [
      'PG & Bike Rental System was founded to solve the real-world problems of finding quality accommodation and reliable transportation.',
      'We believe in transparency, innovation, and customer-first service.'
    ]
  },
  whyChooseUs: [
    { icon: '✅', title: 'Secure Booking', description: 'Industry-leading security for all transactions.' },
    { icon: '🚀', title: 'Fast Service', description: 'Quick and easy booking process.' },
    { icon: '💡', title: 'Innovative Features', description: 'Advanced analytics, multi-role support, and more.' }
  ],
  mission: {
    title: 'Our Mission',
    description: 'To provide excellent service and value to our customers.'
  },
  vision: {
    title: 'Our Vision',
    description: 'To become the leading provider in our industry.'
  },
  // Add values, offices, team, etc. as needed
};

router.get('/', (req, res) => {
  res.json({ success: true, data: aboutData });
});

export default router;
