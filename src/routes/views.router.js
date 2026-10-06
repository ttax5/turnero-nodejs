import { Router } from 'express';
import {
    renderHome,
    renderServices,
    renderAvailability,
    renderBookingDetail
} from '../controllers/views.controller.js';

const router = Router();

// GET /views - Inicio
router.get('/', renderHome);

// GET /views/services - Listado de servicios en tiempo real
router.get('/services', renderServices);

// GET /views/availability - Disponibilidad de servicios y reservas en tiempo real
router.get('/availability', renderAvailability);

// GET /views/bookings/:bid - Detalle de una reserva con sus servicios (populate), en tiempo real
router.get('/bookings/:bid', renderBookingDetail);

export default router;
