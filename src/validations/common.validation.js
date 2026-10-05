import { z } from 'zod';

// Acepta números o strings numéricos ("60") para no romper clientes que envían
// formularios; cualquier otra cosa (texto, vacío, booleano) es inválida.
export const numeric = (schema) => z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    schema
);

// Acepta true/false o los strings "true"/"false"
export const booleanish = (message) => z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean({ error: message })
);

export const requiredString = (field) => z
    .string({ error: `${field} es obligatorio y debe ser texto` })
    .trim()
    .min(1, { error: `${field} no puede estar vacío` });

// ObjectId de MongoDB: 24 caracteres hexadecimales
export const objectId = (field) => z
    .string({ error: `${field} es obligatorio` })
    .regex(/^[a-f\d]{24}$/i, { error: `${field} no es un id válido` });
