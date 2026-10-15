import { Router } from 'express';
import {
    getBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    addServiceToBooking,
    updateServiceQuantity,
    removeServiceFromBooking,
    clearBookingServices
} from '../controllers/bookings.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
    createBookingSchema,
    updateBookingSchema,
    bookingIdParamsSchema,
    bookingServiceParamsSchema,
    addServiceToBookingSchema,
    updateServiceQuantitySchema
} from '../validations/booking.validation.js';

const router = Router();

const bookingParams = validateParams(bookingIdParamsSchema);
const bookingServiceParams = validateParams(bookingServiceParamsSchema);

// GET /api/bookings - Devuelve todas las reservas
router.get('/', getBookings);

// GET /api/bookings/:bid - Reserva por id con los servicios completos (populate)
router.get('/:bid', getBookingById);

// POST /api/bookings - Crea una reserva
router.post('/', validateBody(createBookingSchema), createBooking);

// PUT /api/bookings/:bid - Actualiza datos de la reserva (cliente, fecha, hora, estado)
router.put('/:bid', bookingParams, validateBody(updateBookingSchema), updateBooking);

// DELETE /api/bookings/:bid - Elimina la reserva
router.delete('/:bid', bookingParams, deleteBooking);

// DELETE /api/bookings/:bid/services - Vacía la reserva (quita todos sus servicios)
router.delete('/:bid/services', bookingParams, clearBookingServices);

// POST /api/bookings/:bid/services/:sid - Agrega un servicio (si ya estaba, suma quantity)
router.post('/:bid/services/:sid', bookingServiceParams, validateBody(addServiceToBookingSchema), addServiceToBooking);

// PUT /api/bookings/:bid/services/:sid - Reemplaza la cantidad de un servicio de la reserva
router.put('/:bid/services/:sid', bookingServiceParams, validateBody(updateServiceQuantitySchema), updateServiceQuantity);

// DELETE /api/bookings/:bid/services/:sid - Quita un servicio de la reserva
router.delete('/:bid/services/:sid', bookingServiceParams, removeServiceFromBooking);

export default router;
