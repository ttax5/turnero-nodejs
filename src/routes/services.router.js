import { Router } from 'express';
import {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService
} from '../controllers/services.controller.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
    createServiceSchema,
    updateServiceSchema,
    servicesQuerySchema
} from '../validations/service.validation.js';

const router = Router();

// GET /api/services - Lista servicios con filtros, paginación y ordenamiento
// ?category=&available=&page=&limit=&sortBy=&order=
router.get('/', validateQuery(servicesQuerySchema), getServices);

// GET /api/services/:sid - Devuelve un servicio por id
router.get('/:sid', getServiceById);

// POST /api/services - Crea un servicio
router.post('/', validateBody(createServiceSchema), createService);

// PUT /api/services/:sid - Actualiza un servicio (no se puede modificar el id)
router.put('/:sid', validateBody(updateServiceSchema), updateService);

// DELETE /api/services/:sid - Elimina un servicio
router.delete('/:sid', deleteService);

export default router;
