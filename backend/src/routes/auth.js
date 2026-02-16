import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /auth/login
 * @desc    Login de usuário
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /auth/me
 * @desc    Obter dados do usuário autenticado
 * @access  Private
 */
router.get('/me', authenticateToken, getCurrentUser);

export default router;
