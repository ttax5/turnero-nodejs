import { Router } from 'express';
import { ServiceManager } from '../managers/ServiceManager.js';

const router = Router();
const serviceManager = new ServiceManager();

// GET /api/services - Devuelve todos los servicios
router.get('/', async (req, res) => {
    try {
        const services = await serviceManager.getServices();
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
});

// GET /api/services/:sid - Devuelve un servicio por id
router.get('/:sid', async (req, res) => {
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
});

// POST /api/services - Crea un servicio
router.post('/', async (req, res) => {
    const { name, description, duration, price, category, available } = req.body;

    // Validación de campos
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
});

// PUT /api/services/:sid - Actualiza un servicio (no se puede modificar el id)
router.put('/:sid', async (req, res) => {
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
});

// DELETE /api/services/:sid - Elimina un servicio
router.delete('/:sid', async (req, res) => {
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
});

export default router;

