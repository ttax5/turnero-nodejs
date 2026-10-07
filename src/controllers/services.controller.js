import { ServiceManager } from '../managers/ServiceManager.js';

const serviceManager = new ServiceManager();

// Los controllers sólo leen la request, llaman al manager y arman la response.
// Las validaciones y el filtrado viven en el manager; acá sólo se traduce el
// error que lance (400 o 404) a la respuesta HTTP. Cualquier otro error es 500.
const sendError = (res, error) => {
    res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.statusCode ? error.message : 'Error interno del servidor'
    });
};

// GET /api/services?category=&available=
export const getServices = async (req, res) => {
    try {
        const { category, available } = req.query;
        const services = await serviceManager.getServices({ category, available });
        res.status(200).json({ status: 'success', payload: services });
    } catch (error) {
        sendError(res, error);
    }
};

// GET /api/services/:sid
export const getServiceById = async (req, res) => {
    try {
        const service = await serviceManager.getServiceById(req.params.sid);
        res.status(200).json({ status: 'success', payload: service });
    } catch (error) {
        sendError(res, error);
    }
};

// POST /api/services
export const createService = async (req, res) => {
    try {
        const newService = await serviceManager.addService(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Servicio creado exitosamente',
            payload: newService
        });
    } catch (error) {
        sendError(res, error);
    }
};

// PUT /api/services/:sid
export const updateService = async (req, res) => {
    try {
        const updatedService = await serviceManager.updateService(req.params.sid, req.body);
        res.status(200).json({
            status: 'success',
            message: 'Servicio actualizado exitosamente',
            payload: updatedService
        });
    } catch (error) {
        sendError(res, error);
    }
};

// DELETE /api/services/:sid
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
        sendError(res, error);
    }
};
