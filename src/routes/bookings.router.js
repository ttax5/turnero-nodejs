import { Router } from 'express';
import {
    getBookings,
    getBookingById,
    createBooking,
    addServiceToBooking
} from '../controllers/bookings.controller.js';

const router = Router();

// GET /api/bookings - Devuelve todas las reservas
router.get('/', getBookings);

// GET /api/bookings/:bid - Devuelve una reserva por id
router.get('/:bid', getBookingById);

// POST /api/bookings - Crea una nueva reserva
router.post('/', createBooking);

// POST /api/bookings/:bid/services/:sid - Agrega un servicio a una reserva
router.post('/:bid/services/:sid', addServiceToBooking);

export default router;
