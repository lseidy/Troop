import express from 'express';
import { createRoute, listRoutes } from '../controllers/routeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isDriver } from '../middleware/isDriver.js';

const router = express.Router();

// GET /routes - listar com filtros
router.get('/', authenticateToken, listRoutes);

// POST /routes - criar nova rota (APENAS motoristas)
router.post('/', authenticateToken, isDriver, createRoute);

export default router;
