import { servicesRepository } from '../repositories/services.repository.js';
import { bookingsRepository } from '../repositories/bookings.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

// La forma y los tipos de los datos ya fueron validados con Zod
// (src/validations/service.validation.js) antes de llegar a esta capa.
class ServicesService {
    constructor(repository, bookingRepo) {
        this.repository = repository;
        this.bookingRepository = bookingRepo;
    }

    // Listado completo (lo usan las vistas y las notificaciones en tiempo real)
    async getServices(filters = {}) {
        return await this.repository.getAll(filters);
    }

    // Listado con filtros, paginación y ordenamiento.
    // query: { category?, available?, page, limit, sortBy?, order } ya validado.
    async getPaginatedServices(query) {
        const { category, available, page, limit, sortBy, order } = query;

        const { docs, total } = await this.repository.getPaginated({
            filters: { category, available },
            page,
            limit,
            sort: sortBy ? { field: sortBy, direction: order === 'desc' ? -1 : 1 } : undefined
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const hasPrevPage = page > 1;
        const hasNextPage = page < totalPages;

        return {
            docs,
            total,
            page,
            limit,
            totalPages,
            hasPrevPage,
            hasNextPage,
            // Si se pidió una página más allá del final, "anterior" es la última página real
            prevPage: hasPrevPage ? Math.min(page - 1, totalPages) : null,
            nextPage: hasNextPage ? page + 1 : null
        };
    }

    async getServiceById(id) {
        const service = await this.repository.getById(id);
        if (!service) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }
        return service;
    }

    async createService(serviceData) {
        const { name, description, duration, price, category, available } = serviceData;
        return await this.repository.create({ name, description, duration, price, category, available });
    }

    async updateService(id, serviceData) {
        // Verificar existencia primero
        const existingService = await this.repository.getById(id);
        if (!existingService) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }

        // El schema de Zod ya descartó campos desconocidos (incluido _id): el id no se modifica
        return await this.repository.update(id, serviceData);
    }

    async deleteService(id) {
        const existingService = await this.repository.getById(id);
        if (!existingService) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }

        // Regla de negocio: no se elimina un servicio que forma parte de reservas activas
        // (dejaría referencias rotas). Las reservas canceladas no cuentan.
        const activeBookings = await this.bookingRepository.countByService(id, {
            excludeStatuses: ['cancelled']
        });
        if (activeBookings > 0) {
            throw new ConflictError(
                `No se puede eliminar el servicio: está incluido en ${activeBookings} reserva(s) activa(s). ` +
                'Quitalo de esas reservas o cancelalas primero, o marcalo como no disponible.'
            );
        }

        return await this.repository.delete(id);
    }
}

export const servicesService = new ServicesService(servicesRepository, bookingsRepository);
