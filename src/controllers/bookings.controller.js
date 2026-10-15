import { bookingsService } from '../services/bookings.service.js';
import { notifyBookingsUpdated } from '../sockets/socket.js';

// Los errores (reserva o servicio inexistente, reserva cancelada, etc.) los lanza
// el service y los responde el manejador centralizado (middlewares/error.middleware.js).

// Responde y avisa en tiempo real a las vistas conectadas
const respondAndNotify = (res, statusCode, message, payload) => {
    res.status(statusCode).json({ status: 'success', message, payload });
    notifyBookingsUpdated();
};

export const getBookings = async (req, res) => {
    const bookings = await bookingsService.getBookings();
    res.status(200).json({ status: 'success', payload: bookings });
};

// Devuelve la reserva con los datos completos de cada servicio (populate)
export const getBookingById = async (req, res) => {
    const booking = await bookingsService.getBookingById(req.params.bid);
    res.status(200).json({ status: 'success', payload: booking });
};

export const createBooking = async (req, res) => {
    const newBooking = await bookingsService.createBooking(req.body);
    respondAndNotify(res, 201, 'Reserva creada exitosamente', newBooking);
};

export const updateBooking = async (req, res) => {
    const { bid } = req.params;
    const updated = await bookingsService.updateBooking(bid, req.body);
    respondAndNotify(res, 200, `Reserva ${bid} actualizada exitosamente`, updated);
};

export const deleteBooking = async (req, res) => {
    const { bid } = req.params;
    const deleted = await bookingsService.deleteBooking(bid);
    respondAndNotify(res, 200, `Reserva ${bid} eliminada exitosamente`, deleted);
};

export const addServiceToBooking = async (req, res) => {
    const { bid, sid } = req.params;
    const { quantity } = req.body; // validado por Zod (por defecto 1)
    const updated = await bookingsService.addServiceToBooking(bid, sid, quantity);
    respondAndNotify(res, 200, `Servicio ${sid} agregado a la reserva ${bid} exitosamente`, updated);
};

export const updateServiceQuantity = async (req, res) => {
    const { bid, sid } = req.params;
    const updated = await bookingsService.updateServiceQuantity(bid, sid, req.body.quantity);
    respondAndNotify(res, 200, `Cantidad del servicio ${sid} actualizada a ${req.body.quantity}`, updated);
};

export const removeServiceFromBooking = async (req, res) => {
    const { bid, sid } = req.params;
    const updated = await bookingsService.removeServiceFromBooking(bid, sid);
    respondAndNotify(res, 200, `Servicio ${sid} quitado de la reserva ${bid}`, updated);
};

export const clearBookingServices = async (req, res) => {
    const { bid } = req.params;
    const updated = await bookingsService.clearBookingServices(bid);
    respondAndNotify(res, 200, `Se quitaron todos los servicios de la reserva ${bid}`, updated);
};
