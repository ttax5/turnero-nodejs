import { z } from 'zod';
import { numeric, booleanish, requiredString } from './common.validation.js';

const serviceFields = {
    name: requiredString('name'),
    description: requiredString('description'),
    duration: numeric(z
        .number({ error: 'duration es obligatorio y debe ser un número' })
        .int({ error: 'duration debe ser un número entero de minutos' })
        .positive({ error: 'duration debe ser mayor a 0' })),
    price: numeric(z
        .number({ error: 'price es obligatorio y debe ser un número' })
        .min(0, { error: 'price no puede ser negativo' })),
    category: requiredString('category'),
    available: booleanish('available es obligatorio y debe ser true o false')
};

// POST /api/services: todos los campos son obligatorios. Los campos desconocidos
// (por ejemplo _id) se descartan: el id lo genera MongoDB.
export const createServiceSchema = z.object(serviceFields);

// PUT /api/services/:sid: campos opcionales, pero al menos uno válido.
export const updateServiceSchema = z
    .object(serviceFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        error: 'Debe enviar al menos un campo para actualizar (name, description, duration, price, category, available)'
    });

const SORTABLE_FIELDS = ['name', 'price', 'duration', 'category', 'createdAt'];

// GET /api/services: query params de filtros, paginación y ordenamiento
export const servicesQuerySchema = z.object({
    category: z.string().trim().min(1, { error: 'category no puede estar vacío' }).optional(),
    available: z
        .enum(['true', 'false'], { error: 'available debe ser true o false' })
        .transform((value) => value === 'true')
        .optional(),
    page: numeric(z
        .number({ error: 'page debe ser un número' })
        .int({ error: 'page debe ser un número entero' })
        .min(1, { error: 'page debe ser mayor o igual a 1' })).default(1),
    limit: numeric(z
        .number({ error: 'limit debe ser un número' })
        .int({ error: 'limit debe ser un número entero' })
        .min(1, { error: 'limit debe ser mayor o igual a 1' })
        .max(100, { error: 'limit no puede ser mayor a 100' })).default(10),
    sortBy: z
        .enum(SORTABLE_FIELDS, { error: `sortBy debe ser uno de: ${SORTABLE_FIELDS.join(', ')}` })
        .optional(),
    order: z.enum(['asc', 'desc'], { error: 'order debe ser asc o desc' }).default('asc')
});
