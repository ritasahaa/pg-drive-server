import OwnerDocument from '../models/OwnerDocument.js';
import OwnerProfile from '../models/OwnerProfile.js';
import { syncKYCStatus } from '../utils/kycUtils.js';

// Upload document
export const uploadDocument = async (req, res) => {
  try {
    const { type, fileUrl, expiryDate, consent } = req.body;
    const doc = new OwnerDocument({
      owner: req.user._id,
      type,
      fileUrl,
      expiryDate,
      consent: !!consent
    });
    await doc.save();
    await syncKYCStatus(req.user._id);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// List all documents for owner
export const getOwnerDocuments = async (req, res) => {
  try {
    const docs = await OwnerDocument.find({ owner: req.user._id });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
  try {
    const doc = await OwnerDocument.findOne({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const doc = await OwnerDocument.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await syncKYCStatus(req.user._id);
    res.json({ message: 'Document deleted', doc });
// Utility: Sync OwnerProfile KYC status based on document verification


async function syncKYCStatus(ownerId) {
  // Required doc types for KYC
  const requiredTypes = ['Aadhaar', 'PAN'];
  const docs = await OwnerDocument.find({ owner: ownerId });
  const verifiedDocs = docs.filter(d => requiredTypes.includes(d.type) && d.status === 'verified');
  let newStatus = 'pending';
  if (verifiedDocs.length === requiredTypes.length) {
    newStatus = 'verified';
  } else if (docs.some(d => d.status === 'rejected')) {
    newStatus = 'rejected';
  }
  await OwnerProfile.findOneAndUpdate(
    { owner_id: ownerId },
    { KYC_status: newStatus, updatedAt: new Date() }
  );
}
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
