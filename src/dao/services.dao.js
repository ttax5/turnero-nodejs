import mongoose from 'mongoose';
import { ServiceModel } from './models/service.model.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ServicesDao {
    // filters: { category?: string, available?: boolean } ya normalizados por el service
    async getAll(filters = {}) {
        const query = {};
        if (filters.category) {
            query.category = { $regex: `^${escapeRegex(filters.category)}$`, $options: 'i' };
        }
        if (typeof filters.available === 'boolean') {
            query.available = filters.available;
        }
        return await ServiceModel.find(query).lean();
    }

    async getById(id) {
        // Un id con formato inválido no puede existir en la colección: se trata como "no encontrado"
        if (!mongoose.isValidObjectId(id)) return null;
        return await ServiceModel.findById(id).lean();
    }

    async create(serviceData) {
        const created = await ServiceModel.create(serviceData);
        return created.toObject();
    }

    async update(id, updateData) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await ServiceModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        }).lean();
    }

    async delete(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        return await ServiceModel.findByIdAndDelete(id).lean();
    }
}

export const servicesDao = new ServicesDao();
