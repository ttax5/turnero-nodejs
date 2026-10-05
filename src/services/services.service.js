import { servicesRepository } from '../repositories/services.repository.js';

class ServicesService {
    constructor(repository) {
        this.repository = repository;
    }

    async getServices(filters = {}) {
        // Normaliza los filtros del query string; el filtrado lo resuelve la base de datos
        const normalized = {};
        if (filters.category && String(filters.category).trim() !== '') {
            normalized.category = String(filters.category).trim();
        }
        if (filters.available !== undefined) {
            normalized.available = String(filters.available) === 'true';
        }
        return await this.repository.getAll(normalized);
    }

    async getServiceById(id) {
        const service = await this.repository.getById(id);
        if (!service) {
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }
        return service;
    }

    async createService(serviceData) {
        const { name, description, duration, price, category, available } = serviceData;

        if (
            name === undefined || name === null || String(name).trim() === '' ||
            description === undefined || description === null || String(description).trim() === '' ||
            duration === undefined || duration === null || isNaN(Number(duration)) ||
            price === undefined || price === null || isNaN(Number(price)) ||
            category === undefined || category === null || String(category).trim() === '' ||
            available === undefined || available === null
        ) {
            throw new Error('Todos los campos son obligatorios: name, description, duration, price, category, available');
        }

        const formattedService = {
            name: String(name).trim(),
            description: String(description).trim(),
            duration: Number(duration),
            price: Number(price),
            category: String(category).trim(),
            available: typeof available === 'boolean' ? available : String(available) === 'true'
        };

        return await this.repository.create(formattedService);
    }

    async updateService(id, serviceData) {
        // Verificar existencia primero
        const existingService = await this.repository.getById(id);
        if (!existingService) {
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }

        const updatePayload = {
            ...(serviceData.name !== undefined && { name: String(serviceData.name).trim() }),
            ...(serviceData.description !== undefined && { description: String(serviceData.description).trim() }),
            ...(serviceData.duration !== undefined && { duration: Number(serviceData.duration) }),
            ...(serviceData.price !== undefined && { price: Number(serviceData.price) }),
            ...(serviceData.category !== undefined && { category: String(serviceData.category).trim() }),
            ...(serviceData.available !== undefined && {
                available: typeof serviceData.available === 'boolean'
                    ? serviceData.available
                    : String(serviceData.available) === 'true'
            })
        };

        return await this.repository.update(id, updatePayload);
    }

    async deleteService(id) {
        const existingService = await this.repository.getById(id);
        if (!existingService) {
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }

        return await this.repository.delete(id);
    }
}

export const servicesService = new ServicesService(servicesRepository);
