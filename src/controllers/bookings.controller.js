import { bookingsService } from '../services/bookings.service.js';
import { notifyBookingsUpdated } from '../sockets/socket.js';

export const getBookings = async (req, res) => {
    try {
        const bookings = await bookingsService.getBookings();
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
};

export const getBookingById = async (req, res) => {
    const { bid } = req.params;
    try {
        const booking = await bookingsService.getBookingById(bid);
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
};

export const createBooking = async (req, res) => {
    try {
        const newBooking = await bookingsService.createBooking(req.body);

        res.status(201).json({
            status: 'success',
            message: 'Reserva creada exitosamente',
            payload: newBooking
        });
        // Avisar en tiempo real a las vistas conectadas
        notifyBookingsUpdated();
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

export const addServiceToBooking = async (req, res) => {
    const { bid, sid } = req.params;
    const { quantity } = req.body; // validado por Zod (por defecto 1)

    try {
        const updatedBooking = await bookingsService.addServiceToBooking(bid, sid, quantity);
        res.status(200).json({
            status: 'success',
            message: `Servicio ${sid} agregado a la reserva ${bid} exitosamente`,
            payload: updatedBooking
        });
        // Avisar en tiempo real a las vistas conectadas
        notifyBookingsUpdated();
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
};
