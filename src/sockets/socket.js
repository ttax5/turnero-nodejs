import { Server } from 'socket.io';
import { servicesService } from '../services/services.service.js';
import { bookingsService } from '../services/bookings.service.js';

let io = null;

// Se inicializa una sola vez desde server.js, sobre el mismo servidor HTTP que Express
export const initSocketServer = (httpServer) => {
    io = new Server(httpServer);

    io.on('connection', (socket) => {
        console.log(`🔌 Cliente conectado (${socket.id})`);
        socket.on('disconnect', () => {
            console.log(`🔌 Cliente desconectado (${socket.id})`);
        });
    });

    return io;
};

// Notificaciones disparadas por acciones reales del sistema (crear/editar/eliminar servicios,
// crear reservas, agregar servicios a reservas). Los datos se obtienen por las mismas capas
// que usa la API, nunca directamente de la base.
// Un fallo al notificar no debe romper la respuesta HTTP que ya se completó.
export const notifyServicesUpdated = async () => {
    if (!io) return;
    try {
        const services = await servicesService.getServices();
        io.emit('servicesUpdated', services);
    } catch (error) {
        console.error('Error al emitir servicesUpdated:', error.message);
    }
};

export const notifyBookingsUpdated = async () => {
    if (!io) return;
    try {
        const bookings = await bookingsService.getBookings();
        io.emit('bookingsUpdated', bookings);
    } catch (error) {
        console.error('Error al emitir bookingsUpdated:', error.message);
    }
};
