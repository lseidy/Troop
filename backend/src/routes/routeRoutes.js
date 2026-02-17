import express from 'express';
import { createRoute, listRoutes, getDriverRoutes, updateRoute } from '../controllers/routeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isDriver } from '../middleware/isDriver.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

// GET /routes - listar com filtros (público)
router.get('/', listRoutes);

// GET /routes/driver - listar rotas do motorista autenticado
router.get('/driver', authenticateToken, isDriver, getDriverRoutes);

// POST /routes - criar nova rota (APENAS administradores)
router.post('/', authenticateToken, isAdmin, createRoute);

// PUT /routes/:id - atualizar rota existente (APENAS administradores)
router.put('/:id', authenticateToken, isAdmin, updateRoute);

export default router;
