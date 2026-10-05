import { bookingsRepository } from '../repositories/bookings.repository.js';
import { servicesRepository } from '../repositories/services.repository.js';

// La forma y los tipos de los datos ya fueron validados con Zod
// (src/validations/booking.validation.js). Acá quedan las reglas de negocio:
// que los servicios existan y que un servicio repetido incremente quantity.
class BookingsService {
    constructor(bookingRepo, serviceRepo) {
        this.bookingRepository = bookingRepo;
        this.serviceRepository = serviceRepo;
    }

    async getBookings() {
        return await this.bookingRepository.getAll();
    }

    // Devuelve la reserva con los datos completos de cada servicio (populate)
    async getBookingById(id) {
        const booking = await this.bookingRepository.getByIdWithServices(id);
        if (!booking) {
            throw new Error(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    async createBooking(bookingData) {
        const { clientName, clientEmail, date, time, status, services } = bookingData;

        const formattedBooking = {
            clientName,
            clientEmail,
            date,
            time,
            status: status ?? 'confirmed',
            services: await this._normalizeServices(services)
        };

        return await this.bookingRepository.create(formattedBooking);
    }

    // Valida que cada servicio referenciado exista y agrupa duplicados sumando quantity
    // (misma regla de negocio que addServiceToBooking)
    async _normalizeServices(services) {
        if (!services) return [];

        const grouped = new Map();
        for (const item of services) {
            const serviceId = item.service;
            const service = await this.serviceRepository.getById(serviceId);
            if (!service) {
                throw new Error(`No se encontró el servicio con el id: ${serviceId}`);
            }
            grouped.set(serviceId, (grouped.get(serviceId) || 0) + item.quantity);
        }

        return [...grouped].map(([service, quantity]) => ({ service, quantity }));
    }

    async addServiceToBooking(bookingId, serviceId, quantity = 1) {
        // 1. Verificar existencia de la reserva
        const booking = await this.bookingRepository.getById(bookingId);
        if (!booking) {
            throw new Error(`No se encontró la reserva con el id: ${bookingId}`);
        }

        // 2. Verificar existencia del servicio
        const service = await this.serviceRepository.getById(serviceId);
        if (!service) {
            throw new Error(`No se encontró el servicio con el id: ${serviceId}`);
        }

        // 3. Regla de negocio: Si el servicio ya fue agregado a la reserva, incrementar quantity
        if (!Array.isArray(booking.services)) {
            booking.services = [];
        }

        const qtyToAdd = Math.max(1, Number(quantity) || 1);
        const existingServiceIndex = booking.services.findIndex(
            item => String(item.service) === String(serviceId)
        );

        if (existingServiceIndex !== -1) {
            booking.services[existingServiceIndex].quantity =
                (Number(booking.services[existingServiceIndex].quantity) || 0) + qtyToAdd;
        } else {
            booking.services.push({
                service: String(serviceId),
                quantity: qtyToAdd
            });
        }

        // 4. Actualizar mediante repositorio
        return await this.bookingRepository.update(bookingId, { services: booking.services });
    }
}

export const bookingsService = new BookingsService(bookingsRepository, servicesRepository);
