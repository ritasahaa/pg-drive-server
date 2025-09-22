import express from 'express';
import {
  uploadDocument,
  getOwnerDocuments,
  getDocumentById,
  deleteDocument
} from '../controllers/ownerDocumentController.js';
import { ownerAuth } from '../middleware/auth.js';

const router = express.Router();

// Owner document verification routes
router.post('/', ownerAuth, uploadDocument);
router.get('/', ownerAuth, getOwnerDocuments);
router.get('/:id', ownerAuth, getDocumentById);
router.delete('/:id', ownerAuth, deleteDocument);

export default router;
