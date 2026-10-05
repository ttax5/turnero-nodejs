import { z } from 'zod';
import { numeric, requiredString, objectId } from './common.validation.js';

const quantity = numeric(z
    .number({ error: 'quantity debe ser un número' })
    .int({ error: 'quantity debe ser un número entero' })
    .min(1, { error: 'quantity debe ser mayor o igual a 1' }));

// POST /api/bookings
export const createBookingSchema = z.object({
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
        .optional(),
    services: z
        .array(z.object({
            service: objectId('service'),
            quantity: quantity.default(1)
        }), { error: 'services debe ser un array de { service, quantity }' })
        .optional()
});

// POST /api/bookings/:bid/services/:sid
export const bookingServiceParamsSchema = z.object({
    bid: objectId('bid'),
    sid: objectId('sid')
});

export const addServiceToBookingSchema = z.object({
    quantity: quantity.default(1)
});
