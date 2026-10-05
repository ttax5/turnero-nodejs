import { bookingsRepository } from '../repositories/bookings.repository.js';
import { servicesRepository } from '../repositories/services.repository.js';

class BookingsService {
    constructor(bookingRepo, serviceRepo) {
        this.bookingRepository = bookingRepo;
        this.serviceRepository = serviceRepo;
    }

    async getBookings() {
        return await this.bookingRepository.getAll();
    }

    async getBookingById(id) {
        const booking = await this.bookingRepository.getById(id);
        if (!booking) {
            throw new Error(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    async createBooking(bookingData) {
        const { clientName, clientEmail, date, time, status, services } = bookingData;

        if (
            !clientName || String(clientName).trim() === '' ||
            !clientEmail || String(clientEmail).trim() === '' ||
            !date || String(date).trim() === '' ||
            !time || String(time).trim() === ''
        ) {
            throw new Error('Los campos clientName, clientEmail, date y time son obligatorios');
        }

        const formattedBooking = {
            clientName: String(clientName).trim(),
            clientEmail: String(clientEmail).trim(),
            date: String(date).trim(),
            time: String(time).trim(),
            status: status ? String(status).trim() : 'confirmed',
            services: await this._normalizeServices(services)
        };

        return await this.bookingRepository.create(formattedBooking);
    }

    // Valida que cada servicio referenciado exista y agrupa duplicados sumando quantity
    // (misma regla de negocio que addServiceToBooking)
    async _normalizeServices(services) {
        if (services === undefined || services === null) return [];
        if (!Array.isArray(services)) {
            throw new Error('El campo services debe ser un array de { service, quantity }');
        }

        const grouped = new Map();
        for (const item of services) {
            const serviceId = String(item?.service ?? '');
            const service = await this.serviceRepository.getById(serviceId);
            if (!service) {
                throw new Error(`No se encontró el servicio con el id: ${serviceId}`);
            }
            const qty = Math.max(1, Number(item.quantity) || 1);
            grouped.set(serviceId, (grouped.get(serviceId) || 0) + qty);
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
