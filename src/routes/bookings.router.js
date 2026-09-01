import { Router } from 'express';
import { BookingManager } from '../managers/BookingManager.js';

const router = Router();
const bookingManager = new BookingManager();

// GET /api/bookings - Devuelve todas las reservas
router.get('/', async (req, res) => {
    try {
        const bookings = await bookingManager.getBookings();
        res.status(200).json({
            status: 'success',
            payload: bookings
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener las reservas',
            error: error.message
        });
    }
});

// GET /api/bookings/:bid - Devuelve una reserva por id
router.get('/:bid', async (req, res) => {
    const { bid } = req.params;
    try {
        const booking = await bookingManager.getBookingById(bid);
        res.status(200).json({
            status: 'success',
            payload: booking
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
});

// POST /api/bookings - Crea una nueva reserva
router.post('/', async (req, res) => {
    const { clientName, clientEmail, date, time, status, services } = req.body;

    // Validación básica de campos obligatorios
    if (!clientName || !clientEmail || !date || !time) {
        return res.status(400).json({
            status: 'error',
            message: 'Los campos clientName, clientEmail, date y time son obligatorios'
        });
    }

    try {
        const newBooking = await bookingManager.createBooking({
            clientName,
            clientEmail,
            date,
            time,
            status,
            services: Array.isArray(services) ? services : []
        });

        res.status(201).json({
            status: 'success',
            message: 'Reserva creada exitosamente',
            payload: newBooking
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// POST /api/bookings/:bid/services/:sid - Agrega un servicio a una reserva
router.post('/:bid/services/:sid', async (req, res) => {
    const { bid, sid } = req.params;
    const quantity = req.body?.quantity || 1;

    try {
        const updatedBooking = await bookingManager.addServiceToBooking(bid, sid, quantity);
        res.status(200).json({
            status: 'success',
            message: `Servicio ${sid} agregado a la reserva ${bid} exitosamente`,
            payload: updatedBooking
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router;

