import express from 'express';
import { getOwnerProfile, updateOwnerProfile, uploadAvatar } from '../controllers/ownerProfileController.js';
import { ownerAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ownerAuth, getOwnerProfile);
router.put('/', ownerAuth, updateOwnerProfile);
router.post('/avatar', ownerAuth, uploadAvatar);

export default router;
