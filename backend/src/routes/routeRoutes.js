import express from 'express';
import { createRoute, listRoutes, getDriverRoutes } from '../controllers/routeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isDriver } from '../middleware/isDriver.js';

const router = express.Router();

// GET /routes - listar com filtros
router.get('/', authenticateToken, listRoutes);

// GET /routes/driver - listar rotas do motorista autenticado
router.get('/driver', authenticateToken, isDriver, getDriverRoutes);

// POST /routes - criar nova rota (APENAS motoristas)
router.post('/', authenticateToken, isDriver, createRoute);

export default router;
