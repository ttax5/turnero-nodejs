import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import servicesRouter from './routes/services.router.js';
import bookingsRouter from './routes/bookings.router.js';
import viewsRouter from './routes/views.router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middlewares para procesar cuerpos JSON y formularios URL encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CSS y JS del cliente, incluido socket.js)
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Handlebars (rutas absolutas para no depender del directorio de ejecución)
app.engine('handlebars', engine({
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Vistas renderizadas con Handlebars
app.get('/', (req, res) => res.redirect('/views'));
app.use('/views', viewsRouter);

// Rutas principales de la API
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Ruta ${req.originalUrl} no encontrada`
    });
});

export default app;
