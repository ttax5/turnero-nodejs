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

    // Igual que getById pero reemplaza cada referencia services.service por el
    // documento completo de la colección services (populate). Sólo para consultar.
    async getByIdWithServices(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await BookingModel.findById(id).populate('services.service').lean();
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

    async delete(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await BookingModel.findByIdAndDelete(id).lean();
    }

    // Cantidad de reservas que incluyen el servicio, excluyendo los estados indicados
    async countByService(serviceId, { excludeStatuses = [] } = {}) {
        if (!mongoose.isValidObjectId(serviceId)) return 0;
        return await BookingModel.countDocuments({
            'services.service': serviceId,
            status: { $nin: excludeStatuses }
        });
    }
}

export const bookingsDao = new BookingsDao();
