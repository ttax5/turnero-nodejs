import { bookingsRepository } from '../repositories/bookings.repository.js';
import { servicesRepository } from '../repositories/services.repository.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';

// La forma y los tipos de los datos ya fueron validados con Zod
// (src/validations/booking.validation.js). Acá quedan las reglas de negocio:
// - los servicios referenciados tienen que existir y estar disponibles
// - agregar un servicio que ya está en la reserva incrementa su quantity
// - una reserva cancelada no admite cambios en sus servicios
// - la reserva guarda sólo { service: ObjectId, quantity }, nunca el servicio completo
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
            throw new NotFoundError(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    async createBooking(bookingData) {
        const { clientName, clientEmail, date, time, status, services } = bookingData;

        return await this.bookingRepository.create({
            clientName,
            clientEmail,
            date,
            time,
            // Sin status explícito se usa el default del modelo: 'pending'
            ...(status && { status }),
            services: await this._normalizeServices(services)
        });
    }

    // Actualiza los datos de la reserva (cliente, fecha, hora, estado).
    // Los servicios se gestionan con sus propios endpoints.
    async updateBooking(id, bookingData) {
        await this._getExistingBooking(id);
        return await this.bookingRepository.update(id, bookingData);
    }

    async deleteBooking(id) {
        await this._getExistingBooking(id);
        return await this.bookingRepository.delete(id);
    }

    async addServiceToBooking(bookingId, serviceId, quantity = 1) {
        const booking = await this._getModifiableBooking(bookingId);
        await this._getBookableService(serviceId, NotFoundError);

        // Regla de negocio: si el servicio ya fue agregado, se incrementa quantity
        const services = [...booking.services];
        const index = this._findServiceIndex(services, serviceId);

        if (index !== -1) {
            services[index] = { ...services[index], quantity: services[index].quantity + quantity };
        } else {
            services.push({ service: serviceId, quantity });
        }

        return await this.bookingRepository.update(bookingId, { services });
    }

    // Reemplaza la cantidad de un servicio que ya está en la reserva
    async updateServiceQuantity(bookingId, serviceId, quantity) {
        const booking = await this._getModifiableBooking(bookingId);
        const index = this._findServiceIndex(booking.services, serviceId);
        if (index === -1) {
            throw new NotFoundError(`El servicio ${serviceId} no forma parte de la reserva ${bookingId}`);
        }

        const services = [...booking.services];
        services[index] = { ...services[index], quantity };
        return await this.bookingRepository.update(bookingId, { services });
    }

    async removeServiceFromBooking(bookingId, serviceId) {
        const booking = await this._getModifiableBooking(bookingId);
        const index = this._findServiceIndex(booking.services, serviceId);
        if (index === -1) {
            throw new NotFoundError(`El servicio ${serviceId} no forma parte de la reserva ${bookingId}`);
        }

        const services = booking.services.filter((_, i) => i !== index);
        return await this.bookingRepository.update(bookingId, { services });
    }

    // Vacía la reserva: quita todos sus servicios pero conserva la reserva
    async clearBookingServices(bookingId) {
        await this._getModifiableBooking(bookingId);
        return await this.bookingRepository.update(bookingId, { services: [] });
    }

    // ---------- Helpers internos ----------

    async _getExistingBooking(id) {
        const booking = await this.bookingRepository.getById(id);
        if (!booking) {
            throw new NotFoundError(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    async _getModifiableBooking(id) {
        const booking = await this._getExistingBooking(id);
        if (booking.status === 'cancelled') {
            throw new ConflictError(`La reserva ${id} está cancelada: no se pueden modificar sus servicios`);
        }
        return booking;
    }

    // NotFound: 404 cuando el id viene en la URL; 400 cuando viene en el body de la reserva
    async _getBookableService(serviceId, NotFound = BadRequestError) {
        const service = await this.serviceRepository.getById(serviceId);
        if (!service) {
            throw new NotFound(`No se encontró el servicio con el id: ${serviceId}`);
        }
        if (!service.available) {
            throw new ConflictError(`El servicio "${service.name}" no está disponible para reservar`);
        }
        return service;
    }

    _findServiceIndex(services, serviceId) {
        return services.findIndex(item => String(item.service) === String(serviceId));
    }

    // Valida que cada servicio exista y esté disponible, y agrupa duplicados sumando
    // quantity (misma regla de negocio que addServiceToBooking)
    async _normalizeServices(services) {
        if (!services) return [];

        const grouped = new Map();
        for (const { service: serviceId, quantity } of services) {
            await this._getBookableService(serviceId);
            grouped.set(serviceId, (grouped.get(serviceId) || 0) + quantity);
        }

        return [...grouped].map(([service, quantity]) => ({ service, quantity }));
    }
}

export const bookingsService = new BookingsService(bookingsRepository, servicesRepository);
