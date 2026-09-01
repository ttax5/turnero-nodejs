import express from 'express';
import servicesRouter from './routes/services.router.js';
import bookingsRouter from './routes/bookings.router.js';

const app = express();

// Middlewares para procesar cuerpos JSON y formularios URL encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas principales de la API
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);

// Ruta de bienvenida / salud
app.get('/', (req, res) => {
    res.json({
        message: 'Bienvenido a la API del Sistema de Turnos y Reservas',
        endpoints: {
            services: '/api/services',
            bookings: '/api/bookings'
        },
        version: '1.0.0'
    });
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Ruta ${req.originalUrl} no encontrada`
    });
});

export default app;
