import { servicesService } from '../services/services.service.js';
import { bookingsService } from '../services/bookings.service.js';

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
