import { bookingsDao } from '../dao/bookings.dao.js';

class BookingsRepository {
    constructor(dao) {
        this.dao = dao;
    }

    async getAll() {
        return await this.dao.getAll();
    }

    async getById(id) {
        return await this.dao.getById(id);
    }

    async create(bookingData) {
        return await this.dao.create(bookingData);
    }

    async update(id, bookingData) {
        return await this.dao.update(id, bookingData);
    }
}

export const bookingsRepository = new BookingsRepository(bookingsDao);
