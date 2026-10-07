import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ServiceManager } from './ServiceManager.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_FIELDS = ['clientName', 'clientEmail', 'date', 'time'];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Cantidad a agregar: entero mayor o igual a 1. Si no se envía, es 1.
 */
const parseQuantity = (quantity) => {
    if (quantity === undefined || quantity === null) return 1;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
        throw new ValidationError('El campo quantity debe ser un número entero mayor o igual a 1');
    }
    return qty;
};

export class BookingManager {
    constructor(customPath, serviceManagerInstance) {
        this.path = customPath || path.resolve(__dirname, '../data/bookings.json');
        this.serviceManager = serviceManagerInstance || new ServiceManager();
    }

    /**
     * Lee el archivo bookings.json y devuelve el array de reservas.
     * Si el archivo no existe, lo crea con un array vacío.
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
     * Obtiene una reserva por su ID. Si no existe lanza NotFoundError.
     */
    async getBookingById(id) {
        const bookings = await this.readBookings();
        const booking = bookings.find(b => String(b.id) === String(id));
        if (!booking) {
            throw new NotFoundError(`No se encontró la reserva con el id: ${id}`);
        }
        return booking;
    }

    /**
     * Crea una reserva. Único lugar donde se validan los campos obligatorios.
     * Puede iniciarse con services vacío. Si se envían services, cada uno tiene
     * que existir y se guarda sólo su id y su cantidad (los repetidos se suman).
     */
    async createBooking(bookingData) {
        const input = bookingData && typeof bookingData === 'object' ? bookingData : {};

        const missing = REQUIRED_FIELDS.filter(field => isBlank(input[field]));
        if (missing.length > 0) {
            throw new ValidationError(`Faltan campos obligatorios: ${missing.join(', ')}`);
        }

        const services = await this.normalizeServices(input.services);
        const bookings = await this.readBookings();

        const newBooking = {
            id: crypto.randomUUID(),
            clientName: String(input.clientName).trim(),
            clientEmail: String(input.clientEmail).trim(),
            date: String(input.date).trim(),
            time: String(input.time).trim(),
            status: isBlank(input.status) ? 'confirmed' : String(input.status).trim(),
            services
        };

        bookings.push(newBooking);
        await this.writeBookings(bookings);
        return newBooking;
    }

    /**
     * Convierte el array services recibido en [{ service: id, quantity }],
     * validando que cada servicio exista y sumando las cantidades repetidas.
     */
    async normalizeServices(services) {
        if (services === undefined || services === null) return [];
        if (!Array.isArray(services)) {
            throw new ValidationError('El campo services debe ser un array de { service, quantity }');
        }

        const grouped = new Map();
        for (const item of services) {
            if (!item || isBlank(item.service)) {
                throw new ValidationError('Cada elemento de services debe tener el id del servicio en "service"');
            }
            const serviceId = String(item.service);
            const quantity = parseQuantity(item.quantity);

            try {
                await this.serviceManager.getServiceById(serviceId);
            } catch {
                throw new ValidationError(`No existe el servicio con el id: ${serviceId}`);
            }
            grouped.set(serviceId, (grouped.get(serviceId) || 0) + quantity);
        }

        return [...grouped].map(([service, quantity]) => ({ service, quantity }));
    }

    /**
     * Agrega un servicio a una reserva existente.
     * Valida que la reserva y el servicio existan. Si el servicio ya está en la
     * reserva incrementa quantity; si no, lo agrega como { service: id, quantity }.
     */
    async addServiceToBooking(bookingId, serviceId, quantity) {
        const qtyToAdd = parseQuantity(quantity);
        const bookings = await this.readBookings();
        const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));

        if (bookingIndex === -1) {
            throw new NotFoundError(`No se encontró la reserva con el id: ${bookingId}`);
        }

        // Lanza NotFoundError si el servicio no existe en services.json
        await this.serviceManager.getServiceById(serviceId);

        const booking = bookings[bookingIndex];
        if (!Array.isArray(booking.services)) {
            booking.services = [];
        }

        const existing = booking.services.find(item => String(item.service) === String(serviceId));
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 0) + qtyToAdd;
        } else {
            booking.services.push({ service: String(serviceId), quantity: qtyToAdd });
        }

        bookings[bookingIndex] = booking;
        await this.writeBookings(bookings);
        return booking;
    }
}
