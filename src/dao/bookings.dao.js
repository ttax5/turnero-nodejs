import mongoose from 'mongoose';
import { BookingModel } from './models/booking.model.js';

class BookingsDao {
    async getAll() {
        return await BookingModel.find().lean();
    }

    async getById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await BookingModel.findById(id).lean();
    }

    async create(bookingData) {
        const created = await BookingModel.create(bookingData);
        return created.toObject();
    }

    async update(id, updateData) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await BookingModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        }).lean();
    }
}

export const bookingsDao = new BookingsDao();
