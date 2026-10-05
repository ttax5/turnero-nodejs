import { Router } from 'express';
import {
    getBookings,
    getBookingById,
    createBooking,
    addServiceToBooking
} from '../controllers/bookings.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
    createBookingSchema,
    bookingServiceParamsSchema,
    addServiceToBookingSchema
} from '../validations/booking.validation.js';

const router = Router();

// GET /api/bookings - Devuelve todas las reservas
router.get('/', getBookings);

// GET /api/bookings/:bid - Devuelve una reserva por id con los servicios completos (populate)
router.get('/:bid', getBookingById);

// POST /api/bookings - Crea una nueva reserva
router.post('/', validateBody(createBookingSchema), createBooking);

// POST /api/bookings/:bid/services/:sid - Agrega un servicio a una reserva
router.post(
    '/:bid/services/:sid',
    validateParams(bookingServiceParamsSchema),
    validateBody(addServiceToBookingSchema),
    addServiceToBooking
);

export default router;
