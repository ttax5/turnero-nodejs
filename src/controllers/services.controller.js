import { servicesService } from '../services/services.service.js';
import { notifyServicesUpdated } from '../sockets/socket.js';

// Arma el link a otra página conservando los demás query params
const buildPageLink = (req, page) => {
    const params = new URLSearchParams(req.query);
    params.set('page', page);
    return `${req.baseUrl}?${params.toString()}`;
};

export const getServices = async (req, res) => {
    try {
        // Query ya validado y convertido por el middleware validateQuery
        const result = await servicesService.getPaginatedServices(req.validatedQuery);

        res.status(200).json({
            status: 'success',
            payload: result.docs,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
            prevLink: result.hasPrevPage ? buildPageLink(req, result.prevPage) : null,
            nextLink: result.hasNextPage ? buildPageLink(req, result.nextPage) : null
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
        // Avisar en tiempo real a las vistas conectadas
        notifyServicesUpdated();
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

export const updateService = async (req, res) => {
    const { sid } = req.params;
    try {
        const updatedService = await servicesService.updateService(sid, req.body);
        res.status(200).json({
            status: 'success',
            message: 'Servicio actualizado exitosamente',
            payload: updatedService
        });
        // Avisar en tiempo real a las vistas conectadas
        notifyServicesUpdated();
    } catch (error) {
        // Datos inválidos según el schema → 400; servicio inexistente → 404
        res.status(error.name === 'ValidationError' ? 400 : 404).json({
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
        // Avisar en tiempo real a las vistas conectadas
        notifyServicesUpdated();
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: error.message
        });
    }
};
