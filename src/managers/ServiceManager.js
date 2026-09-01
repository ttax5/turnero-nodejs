import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServiceManager {
    constructor(customPath) {
        this.path = customPath || path.resolve(__dirname, '../data/services.json');
    }

    /**
     * Lee el archivo services.json y devuelve el array de servicios.
     * Si el archivo no existe o está vacío, lo inicializa como un array vacío.
     */
    async readServices() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Si el archivo no existe, lo creamos con un array vacío
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
     * Obtiene todos los servicios persistidos.
     */
    async getServices() {
        return await this.readServices();
    }

    /**
     * Obtiene un servicio específico por su ID.
     */
    async getServiceById(id) {
        const services = await this.readServices();
        const service = services.find(s => String(s.id) === String(id));
        if (!service) {
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }
        return service;
    }

    /**
     * Agrega un nuevo servicio validando campos obligatorios y generando un ID único.
     */
    async addService(serviceData) {
        const { name, description, duration, price, category, available } = serviceData;

        // Validaciones de presencia de campos obligatorios
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

        const services = await this.readServices();

        const newService = {
            id: Date.now().toString(),
            name: String(name).trim(),
            description: String(description).trim(),
            duration: Number(duration),
            price: Number(price),
            category: String(category).trim(),
            available: typeof available === 'boolean' ? available : available === 'true'
        };

        services.push(newService);
        await this.writeServices(services);
        return newService;
    }

    /**
     * Actualiza un servicio existente por su ID manteniendo inmutable el id.
     */
    async updateService(id, serviceData) {
        const services = await this.readServices();
        const index = services.findIndex(s => String(s.id) === String(id));

        if (index === -1) {
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }

        const current = services[index];
        const updatedService = {
            ...current,
            ...(serviceData.name !== undefined && { name: String(serviceData.name).trim() }),
            ...(serviceData.description !== undefined && { description: String(serviceData.description).trim() }),
            ...(serviceData.duration !== undefined && { duration: Number(serviceData.duration) }),
            ...(serviceData.price !== undefined && { price: Number(serviceData.price) }),
            ...(serviceData.category !== undefined && { category: String(serviceData.category).trim() }),
            ...(serviceData.available !== undefined && {
                available: typeof serviceData.available === 'boolean'
                    ? serviceData.available
                    : serviceData.available === 'true'
            }),
            id: current.id // El ID jamás debe ser modificado
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
            throw new Error(`No se encontró el servicio con el id: ${id}`);
        }

        const [deletedService] = services.splice(index, 1);
        await this.writeServices(services);
        return deletedService;
    }
}
