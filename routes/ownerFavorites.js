import express from 'express';
import { getOwnerFavorites, toggleFavorite } from '../controllers/ownerFavoriteController.js';
import { ownerAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ownerAuth, getOwnerFavorites);
router.post('/toggle', ownerAuth, toggleFavorite);

export default router;
