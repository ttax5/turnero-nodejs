import { servicesService } from '../services/services.service.js';
import { bookingsService } from '../services/bookings.service.js';
import { NotFoundError } from '../utils/errors.js';

// Total de turnos de una reserva (suma de quantity de cada servicio asociado)
const withTotals = (bookings) => bookings.map(booking => ({
    ...booking,
    totalServices: (booking.services || []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
}));

export const renderHome = (req, res) => {
    res.render('home', {
        title: 'Inicio',
        message: 'Bienvenido al Sistema de Turnos y Reservas'
    });
};

// GET /views/services - Listado de servicios (datos reales vía service → repository → DAO)
export const renderServices = async (req, res) => {
    try {
        const services = await servicesService.getServices();
        res.render('services', {
            title: 'Servicios',
            page: 'services',
            realtime: true,
            services
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            message: 'No se pudieron cargar los servicios'
        });
    }
};

// GET /views/availability - Disponibilidad de servicios y reservas registradas
export const renderAvailability = async (req, res) => {
    try {
        const [services, bookings] = await Promise.all([
            servicesService.getServices(),
            bookingsService.getBookings()
        ]);

        res.render('availability', {
            title: 'Disponibilidad',
            page: 'availability',
            realtime: true,
            availableServices: services.filter(s => s.available),
            unavailableServices: services.filter(s => !s.available),
            bookings: withTotals(bookings)
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            message: 'No se pudo cargar la disponibilidad'
        });
    }
};

// Agrega subtotales y totales a una reserva con servicios populados.
// Si un servicio referenciado ya no existe, populate devuelve null.
const withBookingTotals = (booking) => {
    const items = (booking.services || []).map(({ service, quantity }) => ({
        service,
        quantity,
        missing: !service,
        subtotal: service ? service.price * quantity : 0,
        minutes: service ? service.duration * quantity : 0
    }));

    return {
        ...booking,
        items,
        totalPrice: items.reduce((acc, item) => acc + item.subtotal, 0),
        totalMinutes: items.reduce((acc, item) => acc + item.minutes, 0),
        totalUnits: items.reduce((acc, item) => acc + item.quantity, 0)
    };
};

// GET /views/bookings/:bid - Detalle de una reserva con sus servicios completos (populate)
export const renderBookingDetail = async (req, res) => {
    try {
        const booking = await bookingsService.getBookingById(req.params.bid);
        res.render('booking-detail', {
            title: `Reserva de ${booking.clientName}`,
            page: 'booking-detail',
            realtime: true,
            booking: withBookingTotals(booking)
        });
    } catch (error) {
        const notFound = error instanceof NotFoundError;
        res.status(notFound ? 404 : 500).render('error', {
            title: notFound ? 'Reserva no encontrada' : 'Error',
            message: notFound ? error.message : 'No se pudo cargar la reserva'
        });
    }
};
