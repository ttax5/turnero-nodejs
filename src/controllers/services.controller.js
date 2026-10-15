import { servicesService } from '../services/services.service.js';
import { notifyServicesUpdated } from '../sockets/socket.js';

// Los errores (servicio inexistente, servicio en uso, etc.) los lanza el service y
// los responde el manejador centralizado (middlewares/error.middleware.js).

// Responde y avisa en tiempo real a las vistas conectadas
const respondAndNotify = (res, statusCode, message, payload) => {
    res.status(statusCode).json({ status: 'success', message, payload });
    notifyServicesUpdated();
};

// Arma el link a otra página conservando los demás query params
const buildPageLink = (req, page) => {
    const params = new URLSearchParams(req.query);
    params.set('page', page);
    return `${req.baseUrl}?${params.toString()}`;
};

export const getServices = async (req, res) => {
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
};

export const getServiceById = async (req, res) => {
    const service = await servicesService.getServiceById(req.params.sid);
    res.status(200).json({ status: 'success', payload: service });
};

export const createService = async (req, res) => {
    const newService = await servicesService.createService(req.body);
    respondAndNotify(res, 201, 'Servicio creado exitosamente', newService);
};

export const updateService = async (req, res) => {
    const updated = await servicesService.updateService(req.params.sid, req.body);
    respondAndNotify(res, 200, 'Servicio actualizado exitosamente', updated);
};

export const deleteService = async (req, res) => {
    const { sid } = req.params;
    const deleted = await servicesService.deleteService(sid);
    respondAndNotify(res, 200, `Servicio con id ${sid} eliminado exitosamente`, deleted);
};
