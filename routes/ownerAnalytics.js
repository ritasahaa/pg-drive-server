import express from 'express';
import { getOwnerAnalytics } from '../controllers/ownerAnalyticsController.js';
import { ownerAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ownerAuth, getOwnerAnalytics);

export default router;
