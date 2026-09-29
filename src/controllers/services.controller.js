import { servicesService } from '../services/services.service.js';

export const getServices = async (req, res) => {
    try {
        const { category, available } = req.query;
        const services = await servicesService.getServices({ category, available });
        
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
        const service = await servicesService.getServiceById(sid);
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
    try {
        const newService = await servicesService.createService(req.body);

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
        const updatedService = await servicesService.updateService(sid, updateData);
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
        const deletedService = await servicesService.deleteService(sid);
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
