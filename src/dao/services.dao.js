import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, '../data/services.json');

class ServicesDao {
    constructor() {
        this.path = filePath;
    }

    async _readData() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this._writeData([]);
                return [];
            }
            throw error;
        }
    }

    async _writeData(data) {
        const dir = path.dirname(this.path);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(this.path, JSON.stringify(data, null, 2), 'utf-8');
    }

    async getAll() {
        return await this._readData();
    }

    async getById(id) {
        const services = await this._readData();
        return services.find(s => String(s.id) === String(id)) || null;
    }

    async create(serviceData) {
        const services = await this._readData();
        const newService = {
            id: Date.now().toString(),
            ...serviceData
        };
        services.push(newService);
        await this._writeData(services);
        return newService;
    }

    async update(id, updateData) {
        const services = await this._readData();
        const index = services.findIndex(s => String(s.id) === String(id));
        if (index === -1) return null;

        const updatedService = {
            ...services[index],
            ...updateData,
            id: services[index].id // ID inmutable
        };
        services[index] = updatedService;
        await this._writeData(services);
        return updatedService;
    }

    async delete(id) {
        const services = await this._readData();
        const index = services.findIndex(s => String(s.id) === String(id));
        if (index === -1) return null;

        const [deletedService] = services.splice(index, 1);
        await this._writeData(services);
        return deletedService;
    }
}

export const servicesDao = new ServicesDao();
