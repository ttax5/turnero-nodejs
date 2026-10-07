import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_FIELDS = ['name', 'description', 'duration', 'price', 'category', 'available'];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const isBooleanLike = (value) => typeof value === 'boolean' || value === 'true' || value === 'false';
const toBoolean = (value) => value === true || value === 'true';

/**
 * Único lugar donde se validan los datos de un servicio.
 * - partial = false (alta): todos los campos son obligatorios.
 * - partial = true (modificación): los campos son opcionales, pero los que llegan
 *   tienen que ser válidos y tiene que llegar al menos uno.
 * Devuelve los datos normalizados (tipos convertidos y textos recortados).
 */
const validateServiceData = (data, { partial = false } = {}) => {
    const input = data && typeof data === 'object' ? data : {};
    const fields = SERVICE_FIELDS.filter(field => input[field] !== undefined);

    if (!partial) {
        const missing = SERVICE_FIELDS.filter(field => isBlank(input[field]));
        if (missing.length > 0) {
            throw new ValidationError(`Faltan campos obligatorios: ${missing.join(', ')}`);
        }
    } else if (fields.length === 0) {
        throw new ValidationError(`Debe enviar al menos un campo para actualizar: ${SERVICE_FIELDS.join(', ')}`);
    }

    const normalized = {};
    for (const field of fields) {
        const value = input[field];
        switch (field) {
            case 'name':
            case 'description':
            case 'category':
                if (isBlank(value)) throw new ValidationError(`El campo ${field} no puede estar vacío`);
                normalized[field] = String(value).trim();
                break;
            case 'duration':
                if (isBlank(value) || !Number.isFinite(Number(value)) || Number(value) <= 0) {
                    throw new ValidationError('El campo duration debe ser un número mayor a 0');
                }
                normalized.duration = Number(value);
                break;
            case 'price':
                if (isBlank(value) || !Number.isFinite(Number(value)) || Number(value) < 0) {
                    throw new ValidationError('El campo price debe ser un número mayor o igual a 0');
                }
                normalized.price = Number(value);
                break;
            case 'available':
                if (!isBooleanLike(value)) throw new ValidationError('El campo available debe ser true o false');
                normalized.available = toBoolean(value);
                break;
        }
    }
    return normalized;
};

export class ServiceManager {
    constructor(customPath) {
        this.path = customPath || path.resolve(__dirname, '../data/services.json');
    }

    /**
     * Lee el archivo services.json y devuelve el array de servicios.
     * Si el archivo no existe, lo crea con un array vacío.
     */
    async readServices() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.writeServices([]);
                return [];
            }
            return [];
        }
    }

    /**
     * Guarda el array de servicios en el archivo services.json.
     */
    async writeServices(services) {
        const dir = path.dirname(this.path);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(this.path, JSON.stringify(services, null, 2), 'utf-8');
    }

    /**
     * Obtiene los servicios. Filtros opcionales:
     * - category: compara sin distinguir mayúsculas
     * - available: 'true' / 'false' (o booleano)
     */
    async getServices(filters = {}) {
        const { category, available } = filters;
        let services = await this.readServices();

        if (!isBlank(category)) {
            const wanted = String(category).trim().toLowerCase();
            services = services.filter(s => String(s.category).toLowerCase() === wanted);
        }

        if (available !== undefined) {
            if (!isBooleanLike(available)) {
                throw new ValidationError('El filtro available debe ser true o false');
            }
            const isAvailable = toBoolean(available);
            services = services.filter(s => s.available === isAvailable);
        }

        return services;
    }

    /**
     * Obtiene un servicio por su ID. Si no existe lanza NotFoundError.
     */
    async getServiceById(id) {
        const services = await this.readServices();
        const service = services.find(s => String(s.id) === String(id));
        if (!service) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }
        return service;
    }

    /**
     * Agrega un servicio. Valida los campos y genera el id automáticamente
     * (si llega un id en los datos, se ignora).
     */
    async addService(serviceData) {
        const validData = validateServiceData(serviceData);
        const services = await this.readServices();

        const newService = { id: crypto.randomUUID(), ...validData };

        services.push(newService);
        await this.writeServices(services);
        return newService;
    }

    /**
     * Actualiza un servicio existente. El id nunca se modifica.
     */
    async updateService(id, serviceData) {
        const services = await this.readServices();
        const index = services.findIndex(s => String(s.id) === String(id));

        if (index === -1) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }

        const validData = validateServiceData(serviceData, { partial: true });
        const updatedService = {
            ...services[index],
            ...validData,
            id: services[index].id // El id jamás se modifica
        };

        services[index] = updatedService;
        await this.writeServices(services);
        return updatedService;
    }

    /**
     * Elimina un servicio por su ID.
     */
    async deleteService(id) {
        const services = await this.readServices();
        const index = services.findIndex(s => String(s.id) === String(id));

        if (index === -1) {
            throw new NotFoundError(`No se encontró el servicio con el id: ${id}`);
        }

        const [deletedService] = services.splice(index, 1);
        await this.writeServices(services);
        return deletedService;
    }
}
