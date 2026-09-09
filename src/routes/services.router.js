import { Router } from 'express';
import {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService
} from '../controllers/services.controller.js';

const router = Router();

// GET /api/services - Devuelve todos los servicios
router.get('/', getServices);

// GET /api/services/:sid - Devuelve un servicio por id
router.get('/:sid', getServiceById);

// POST /api/services - Crea un servicio
router.post('/', createService);

// PUT /api/services/:sid - Actualiza un servicio (no se puede modificar el id)
router.put('/:sid', updateService);

// DELETE /api/services/:sid - Elimina un servicio
router.delete('/:sid', deleteService);

export default router;
