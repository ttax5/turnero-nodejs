import { BookingManager } from '../managers/BookingManager.js';

const bookingManager = new BookingManager();

// Los controllers sólo leen la request, llaman al manager y arman la response.
// Las validaciones viven en el manager; acá sólo se traduce el error que lance
// (400 o 404) a la respuesta HTTP. Cualquier otro error es 500.
const sendError = (res, error) => {
    res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.statusCode ? error.message : 'Error interno del servidor'
    });
};

// GET /api/bookings
export const getBookings = async (req, res) => {
    try {
        const bookings = await bookingManager.getBookings();
        res.status(200).json({ status: 'success', payload: bookings });
    } catch (error) {
        sendError(res, error);
    }
};

// GET /api/bookings/:bid
export const getBookingById = async (req, res) => {
    try {
        const booking = await bookingManager.getBookingById(req.params.bid);
        res.status(200).json({ status: 'success', payload: booking });
    } catch (error) {
        sendError(res, error);
    }
};

// POST /api/bookings
export const createBooking = async (req, res) => {
    try {
        const newBooking = await bookingManager.createBooking(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Reserva creada exitosamente',
            payload: newBooking
        });
    } catch (error) {
        sendError(res, error);
    }
};

// POST /api/bookings/:bid/services/:sid  (body opcional: { "quantity": n })
export const addServiceToBooking = async (req, res) => {
    const { bid, sid } = req.params;
    try {
        const updatedBooking = await bookingManager.addServiceToBooking(bid, sid, req.body?.quantity);
        res.status(200).json({
            status: 'success',
            message: `Servicio ${sid} agregado a la reserva ${bid} exitosamente`,
            payload: updatedBooking
        });
    } catch (error) {
        sendError(res, error);
    }
};
