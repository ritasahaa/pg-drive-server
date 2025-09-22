import express from 'express';
import { getOwnerNotifications, markNotificationRead, deleteNotification } from '../controllers/ownerNotificationController.js';
import { ownerAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ownerAuth, getOwnerNotifications);
router.put('/:id/read', ownerAuth, markNotificationRead);
router.delete('/:id', ownerAuth, deleteNotification);

export default router;
