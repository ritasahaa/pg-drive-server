const Offer = require('../models/Offer');

exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const { name, description, images } = req.body;
    const offer = new Offer({ name, description, images, createdBy: req.adminId });
    await offer.save();
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create offer' });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, images, isActive } = req.body;
    const offer = await Offer.findByIdAndUpdate(id, { name, description, images, isActive, updatedAt: Date.now() }, { new: true });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update offer' });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    await Offer.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete offer' });
  }
};
