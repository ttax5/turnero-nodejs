import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServiceManager } from './ServiceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BookingManager {
    constructor(customPath, serviceManagerInstance) {
        this.path = customPath || path.resolve(__dirname, '../data/bookings.json');
        this.serviceManager = serviceManagerInstance || new ServiceManager();
    }

    /**
     * Lee el archivo bookings.json y devuelve el array de reservas.
     * Si no existe o está vacío, lo inicializa como un array vacío.
     */
    async readBookings() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.writeBookings([]);
                return [];
            }
            return [];
        }
    }

    /**
     * Guarda el array de reservas en el archivo bookings.json.
     */
    async writeBookings(bookings) {
        const dir = path.dirname(this.path);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(this.path, JSON.stringify(bookings, null, 2), 'utf-8');
    }

    /**
     * Obtiene todas las reservas guardadas.
     */
    async getBookings() {
        return await this.readBookings();
    }

    /**
     * Obtiene una reserva por su ID.
     */
    async getBookingById(id) {
        const bookings = await this.readBookings();
        const booking = bookings.find(b => String(b.id) === String(id));
        if (!booking) {
            throw new Error(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    /**
     * Crea una nueva reserva validando campos obligatorios.
     * Puede iniciarse con el array de services vacío.
     */
    async createBooking(bookingData) {
        const { clientName, clientEmail, date, time, status, services } = bookingData;

        if (
            !clientName || String(clientName).trim() === '' ||
            !clientEmail || String(clientEmail).trim() === '' ||
            !date || String(date).trim() === '' ||
            !time || String(time).trim() === ''
        ) {
            throw new Error('Los campos clientName, clientEmail, date y time son obligatorios');
        }

        const bookings = await this.readBookings();

        const newBooking = {
            id: Date.now().toString(),
            clientName: String(clientName).trim(),
            clientEmail: String(clientEmail).trim(),
            date: String(date).trim(),
            time: String(time).trim(),
            status: status ? String(status).trim() : 'confirmed',
            services: Array.isArray(services) ? services : []
        };

        bookings.push(newBooking);
        await this.writeBookings(bookings);
        return newBooking;
    }

    /**
     * Agrega un servicio a una reserva existente.
     * Valida que tanto la reserva como el servicio existan.
     * Si el servicio ya existe en la reserva, incrementa quantity.
     * Si no existe, lo agrega con { service: serviceId, quantity: 1 }.
     */
    async addServiceToBooking(bookingId, serviceId, quantity = 1) {
        const bookings = await this.readBookings();
        const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));

        if (bookingIndex === -1) {
            throw new Error(`No se encontró la reserva con el id: ${bookingId}`);
        }

        // Validar que el servicio realmente exista en services.json
        const serviceExists = await this.serviceManager.getServiceById(serviceId);
        if (!serviceExists) {
            throw new Error(`No se encontró el servicio con el id: ${serviceId}`);
        }

        const booking = bookings[bookingIndex];
        if (!Array.isArray(booking.services)) {
            booking.services = [];
        }

        const serviceInBookingIndex = booking.services.findIndex(
            item => String(item.service) === String(serviceId)
        );

        const qtyToAdd = Math.max(1, Number(quantity) || 1);

        if (serviceInBookingIndex !== -1) {
            // Si ya existe, incrementamos la cantidad
            booking.services[serviceInBookingIndex].quantity =
                (Number(booking.services[serviceInBookingIndex].quantity) || 0) + qtyToAdd;
        } else {
            // Si no existe, lo agregamos al array
            booking.services.push({
                service: String(serviceId),
                quantity: qtyToAdd
            });
        }

        bookings[bookingIndex] = booking;
        await this.writeBookings(bookings);
        return booking;
    }
}

