import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, '../data/bookings.json');

class BookingsDao {
    constructor() {
        this.path = filePath;
    }

    async _readData() {
        try {
            const data = await fs.promises.readFile(this.path, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this._writeData([]);
                return [];
            }
            throw error;
        }
    }

    async _writeData(data) {
        const dir = path.dirname(this.path);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(this.path, JSON.stringify(data, null, 2), 'utf-8');
    }

    async getAll() {
        return await this._readData();
    }

    async getById(id) {
        const bookings = await this._readData();
        return bookings.find(b => String(b.id) === String(id)) || null;
    }

    async create(bookingData) {
        const bookings = await this._readData();
        const newBooking = {
            id: Date.now().toString(),
            ...bookingData
        };
        bookings.push(newBooking);
        await this._writeData(bookings);
        return newBooking;
    }

    async update(id, updateData) {
        const bookings = await this._readData();
        const index = bookings.findIndex(b => String(b.id) === String(id));
        if (index === -1) return null;

        const updatedBooking = {
            ...bookings[index],
            ...updateData,
            id: bookings[index].id // ID inmutable
        };
        bookings[index] = updatedBooking;
        await this._writeData(bookings);
        return updatedBooking;
    }
}

export const bookingsDao = new BookingsDao();
