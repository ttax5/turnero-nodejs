import { ServiceManager } from '../managers/ServiceManager.js';

const serviceManager = new ServiceManager();

export const getServices = async (req, res) => {
    try {
        let services = await serviceManager.getServices();
        
        const { category, available } = req.query;
        if (category) {
            services = services.filter(s => s.category.toLowerCase() === category.toLowerCase());
        }
        if (available !== undefined) {
            const isAvailable = available === 'true';
            services = services.filter(s => s.available === isAvailable);
        }

        res.status(200).json({
            status: 'success',
            payload: services
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener los servicios',
            error: error.message
        });
    }
};

export const getServiceById = async (req, res) => {
    const { sid } = req.params;
    try {
        const service = await serviceManager.getServiceById(sid);
        res.status(200).json({
            status: 'success',
            payload: service
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
};

export const createService = async (req, res) => {
    const { name, description, duration, price, category, available } = req.body;

    if (
        !name ||
        !description ||
        duration === undefined ||
        price === undefined ||
        !category ||
        available === undefined
    ) {
        return res.status(400).json({
            status: 'error',
            message: 'Todos los campos son obligatorios: name, description, duration, price, category, available'
        });
    }

    try {
        const newService = await serviceManager.addService({
            name,
            description,
            duration,
            price,
            category,
            available
        });

        res.status(201).json({
            status: 'success',
            message: 'Servicio creado exitosamente',
            payload: newService
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

export const updateService = async (req, res) => {
    const { sid } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Debe enviar al menos un campo para actualizar'
        });
    }

    try {
        const updatedService = await serviceManager.updateService(sid, updateData);
        res.status(200).json({
            status: 'success',
            message: 'Servicio actualizado exitosamente',
            payload: updatedService
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
};

export const deleteService = async (req, res) => {
    const { sid } = req.params;
    try {
        const deletedService = await serviceManager.deleteService(sid);
        res.status(200).json({
            status: 'success',
            message: `Servicio con id ${sid} eliminado exitosamente`,
            payload: deletedService
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
};
