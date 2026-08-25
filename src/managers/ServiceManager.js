import fs from "fs";

export class ServiceManager {
    constructor() {
        this.path = "./src/data/services.json";
    }

    async getServices() {
        try {
            const services = await fs.promises.readFile(this.path, 'utf-8');
            return JSON.parse(services);
        } catch (error) {
            return [];
        }
    }

    async getServiceById(id) {
        const services = await this.getServices();
        const service = services.find(service => service.id === id);
        if (!service) {
            throw new Error(`No se encontró el servicio con el id ${id}`);
        }
        return service;
    }

    async addService(serviceData) {
        const services = await this.getServices();
        const newService = {
            id: Date.now().toString(),
            name: serviceData.name,
            description: serviceData.description,
            duration: serviceData.duration,
            price: serviceData.price,
            category: serviceData.category,
            available: serviceData.available
        }
        if (!serviceData.name || !serviceData.description || !serviceData.duration || !serviceData.price || !serviceData.category || serviceData.available == undefined) {
            throw new Error('Todos los campos son obligatorios');
        }
        services.push(newService);
        await fs.promises.writeFile(this.path, JSON.stringify(services, null, 2));
        return newService;
    }

    async updateService(id, serviceData) {
        const services = await this.getServices();
        const index = services.findIndex(service => service.id === id);
        if (index === -1) {
            throw new Error(`No se encontró el servicio con el id ${id}`);
        }
        const updatedService = {
            ...services[index],
            ...serviceData,
            id: services[index].id
        }
        services[index] = updatedService;
        await fs.promises.writeFile(this.path, JSON.stringify(services, null, 2));
        return updatedService;
    }

    async deleteService(id) {
        const services = await this.getServices();
        const index = services.findIndex(service => service.id === id);
        if (index === -1) {
            throw new Error(`No se encontró el servicio con el id ${id}`);
        }
        services.splice(index, 1);
        await fs.promises.writeFile(this.path, JSON.stringify(services, null, 2));
    }
}
