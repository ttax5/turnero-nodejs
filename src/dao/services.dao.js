import mongoose from 'mongoose';
import { ServiceModel } from './models/service.model.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Construye el filtro de MongoDB a partir de filtros ya normalizados por el service
const buildFilter = (filters = {}) => {
    const query = {};
    if (filters.category) {
        query.category = { $regex: `^${escapeRegex(filters.category)}$`, $options: 'i' };
    }
    if (typeof filters.available === 'boolean') {
        query.available = filters.available;
    }
    return query;
};

class ServicesDao {
    // filters: { category?: string, available?: boolean } ya normalizados por el service
    async getAll(filters = {}) {
        return await ServiceModel.find(buildFilter(filters)).lean();
    }

    // Consulta paginada: filtra, ordena, saltea y limita en la base de datos.
    // sort: { field, direction } con direction 1 (asc) o -1 (desc).
    async getPaginated({ filters = {}, page = 1, limit = 10, sort } = {}) {
        const query = buildFilter(filters);
        // _id como desempate para que el orden entre páginas sea estable
        const sortOption = sort ? { [sort.field]: sort.direction, _id: 1 } : { _id: 1 };

        const [docs, total] = await Promise.all([
            ServiceModel.find(query)
                .sort(sortOption)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ServiceModel.countDocuments(query)
        ]);

        return { docs, total };
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
