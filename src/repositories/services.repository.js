import { servicesDao } from '../dao/services.dao.js';

class ServicesRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async getAll(filters = {}) {
        return await this.dao.getAll(filters);
    }

    async getPaginated(options) {
        return await this.dao.getPaginated(options);
    }

    async getById(id) {
        return await this.dao.getById(id);
    }

    async create(serviceData) {
        return await this.dao.create(serviceData);
    }

    async update(id, serviceData) {
        return await this.dao.update(id, serviceData);
    }

    async delete(id) {
        return await this.dao.delete(id);
    }
}

export const servicesRepository = new ServicesRepository(servicesDao);
