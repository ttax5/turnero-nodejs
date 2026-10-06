import { AppError } from '../utils/errors.js';

// Manejador centralizado de errores. En Express 5 los errores (incluidas las
// promesas rechazadas de los controllers async) llegan acá automáticamente.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    // Errores de negocio lanzados por los services
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }

    // Body con JSON mal formado (express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 'error', message: 'El body no es un JSON válido' });
    }

    // Segunda barrera: validaciones del schema de Mongoose
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ status: 'error', message: err.message });
    }

    console.error(err);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
};

// Rutas inexistentes
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Ruta ${req.originalUrl} no encontrada`
    });
};
