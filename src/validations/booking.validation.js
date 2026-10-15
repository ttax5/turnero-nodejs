import { z } from 'zod';
import { numeric, requiredString, objectId } from './common.validation.js';

const quantity = numeric(z
    .number({ error: 'quantity debe ser un número' })
    .int({ error: 'quantity debe ser un número entero' })
    .min(1, { error: 'quantity debe ser mayor o igual a 1' }));

// Datos propios de la reserva (sin los servicios, que tienen sus propios endpoints)
const bookingFields = {
    clientName: requiredString('clientName'),
    clientEmail: z
        .string({ error: 'clientEmail es obligatorio' })
        .trim()
        .toLowerCase()
        .pipe(z.email({ error: 'clientEmail debe ser un email válido' })),
    date: z
        .string({ error: 'date es obligatorio' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'date debe tener formato YYYY-MM-DD', abort: true })
        .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
            new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), {
            error: 'date no es una fecha válida'
        }),
    time: z
        .string({ error: 'time es obligatorio' })
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'time debe tener formato HH:mm (24 hs)' }),
    status: z
        .enum(['pending', 'confirmed', 'cancelled'], { error: 'status debe ser pending, confirmed o cancelled' })
        .optional()
};

// POST /api/bookings
export const createBookingSchema = z.object({
    ...bookingFields,
    services: z
        .array(z.object({
            service: objectId('service'),
            quantity: quantity.default(1)
        }), { error: 'services debe ser un array de { service, quantity }' })
        .optional()
});

// PUT /api/bookings/:bid: datos de la reserva, opcionales pero al menos uno
export const updateBookingSchema = z
    .object(bookingFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        error: 'Debe enviar al menos un campo para actualizar (clientName, clientEmail, date, time, status)'
    });

// Rutas con :bid
export const bookingIdParamsSchema = z.object({
    bid: objectId('bid')
});

// POST /api/bookings/:bid/services/:sid
export const bookingServiceParamsSchema = z.object({
    bid: objectId('bid'),
    sid: objectId('sid')
});

export const addServiceToBookingSchema = z.object({
    quantity: quantity.default(1)
});

// PUT /api/bookings/:bid/services/:sid: quantity obligatoria
export const updateServiceQuantitySchema = z.object({
    quantity: numeric(z
        .number({ error: 'quantity es obligatorio y debe ser un número' })
        .int({ error: 'quantity debe ser un número entero' })
        .min(1, { error: 'quantity debe ser mayor o igual a 1' }))
});
