import { Router } from 'express';
import {
    renderHome,
    renderServices,
    renderAvailability
} from '../controllers/views.controller.js';

const router = Router();

// GET /views - Inicio
router.get('/', renderHome);

// GET /views/services - Listado de servicios en tiempo real
router.get('/services', renderServices);

// GET /views/availability - Disponibilidad de servicios y reservas en tiempo real
router.get('/availability', renderAvailability);

export default router;
