import express from 'express';
import { createBooking, listBookings, getUserBookings, deleteBooking } from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePassenger } from '../middleware/auth.js';

const router = express.Router();

// POST /bookings - only passengers can create bookings
router.post('/', authenticateToken, requirePassenger, createBooking);

// GET /bookings - list all bookings (protected)
router.get('/', authenticateToken, listBookings);

// GET /bookings/me - listar agendamentos do usuário autenticado
router.get('/me', authenticateToken, getUserBookings);

// DELETE /bookings/:id - cancelar reserva (apenas dono pode cancelar)
router.delete('/:id', authenticateToken, deleteBooking);

export default router;
