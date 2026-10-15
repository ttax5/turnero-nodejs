// Tests de punta a punta de la API, las vistas y Socket.io.
// Levantan un MongoDB en memoria (mongodb-memory-server-core), así que no usan
// ni modifican la base de Atlas configurada en .env.
// Uso: npm test
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { io as ioClient } from 'socket.io-client';

import app from '../src/app.js';
import { initSocketServer } from '../src/sockets/socket.js';
import { ServiceModel } from '../src/dao/models/service.model.js';
import { BookingModel } from '../src/dao/models/booking.model.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let mongo;
let httpServer;
let baseUrl;

const request = async (method, url, body) => {
    const res = await fetch(`${baseUrl}${url}`, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, body: data };
};

const serviceData = (overrides = {}) => ({
    name: 'Masaje',
    description: 'Descontracturante',
    duration: 60,
    price: 7000,
    category: 'Bienestar',
    available: true,
    ...overrides
});

const bookingData = (overrides = {}) => ({
    clientName: 'Juan Pérez',
    clientEmail: 'juan@example.com',
    date: '2026-11-15',
    time: '10:30',
    ...overrides
});

const createService = async (overrides) => (await request('POST', '/api/services', serviceData(overrides))).body.payload;
const createBooking = async (overrides) => (await request('POST', '/api/bookings', bookingData(overrides))).body.payload;

const FAKE_ID = '0123456789abcdef01234567';

before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri('turnero_test'));

    httpServer = createServer(app);
    initSocketServer(httpServer);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    baseUrl = `http://localhost:${httpServer.address().port}`;
});

after(async () => {
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
});

beforeEach(async () => {
    await Promise.all([ServiceModel.deleteMany({}), BookingModel.deleteMany({})]);
});

describe('Servicios: CRUD', () => {
    it('POST /api/services crea un servicio en MongoDB (201)', async () => {
        const res = await request('POST', '/api/services', serviceData());
        assert.equal(res.status, 201);
        assert.equal(res.body.status, 'success');
        assert.ok(mongoose.isValidObjectId(res.body.payload._id));
        assert.equal(await ServiceModel.countDocuments(), 1);
    });

    it('POST /api/services con datos inválidos responde 400 y no llega a la base', async () => {
        const res = await request('POST', '/api/services', { name: 'Masaje', price: -5 });
        assert.equal(res.status, 400);
        assert.equal(res.body.status, 'error');
        const fields = res.body.errors.map((e) => e.field);
        assert.ok(fields.includes('description'));
        assert.ok(fields.includes('price'));
        assert.equal(await ServiceModel.countDocuments(), 0);
    });

    it('POST /api/services ignora un _id enviado en el body', async () => {
        const res = await request('POST', '/api/services', serviceData({ _id: FAKE_ID }));
        assert.equal(res.status, 201);
        assert.notEqual(res.body.payload._id, FAKE_ID);
    });

    it('JSON mal formado responde 400 en JSON', async () => {
        const res = await request('POST', '/api/services', '{"name": ');
        assert.equal(res.status, 400);
        assert.equal(res.body.message, 'El body no es un JSON válido');
    });

    it('GET /api/services/:sid devuelve el servicio (200) o 404', async () => {
        const service = await createService();
        const ok = await request('GET', `/api/services/${service._id}`);
        assert.equal(ok.status, 200);
        assert.equal(ok.body.payload.name, 'Masaje');

        assert.equal((await request('GET', `/api/services/${FAKE_ID}`)).status, 404);
        assert.equal((await request('GET', '/api/services/no-es-un-id')).status, 404);
    });

    it('PUT /api/services/:sid actualiza sólo los campos enviados', async () => {
        const service = await createService();
        const res = await request('PUT', `/api/services/${service._id}`, { price: 9000, _id: FAKE_ID });
        assert.equal(res.status, 200);
        assert.equal(res.body.payload.price, 9000);
        assert.equal(res.body.payload.name, 'Masaje');
        assert.equal(res.body.payload._id, service._id);

        assert.equal((await request('PUT', `/api/services/${service._id}`, {})).status, 400);
        assert.equal((await request('PUT', `/api/services/${service._id}`, { duration: 0 })).status, 400);
        assert.equal((await request('PUT', `/api/services/${FAKE_ID}`, { price: 1 })).status, 404);
    });

    it('DELETE /api/services/:sid elimina el servicio (200) o 404', async () => {
        const service = await createService();
        assert.equal((await request('DELETE', `/api/services/${service._id}`)).status, 200);
        assert.equal(await ServiceModel.countDocuments(), 0);
        assert.equal((await request('DELETE', `/api/services/${service._id}`)).status, 404);
    });

    it('DELETE /api/services/:sid responde 409 si el servicio está en una reserva activa', async () => {
        const service = await createService();
        await createBooking({ services: [{ service: service._id }] });
        const res = await request('DELETE', `/api/services/${service._id}`);
        assert.equal(res.status, 409);
        assert.equal(await ServiceModel.countDocuments(), 1);
    });
});

describe('Servicios: filtros, paginación y ordenamiento', () => {
    beforeEach(async () => {
        await ServiceModel.insertMany([
            serviceData({ name: 'Corte', category: 'Peluquería', price: 1500 }),
            serviceData({ name: 'Coloración', category: 'Peluquería', price: 6500 }),
            serviceData({ name: 'Consulta', category: 'Salud', price: 5000 }),
            serviceData({ name: 'Nutrición', category: 'Salud', price: 4000, available: false }),
            serviceData({ name: 'Manicura', category: 'Estética', price: 3000, available: false })
        ]);
    });

    it('sin query params devuelve la primera página con metadatos', async () => {
        const res = await request('GET', '/api/services');
        assert.equal(res.status, 200);
        assert.equal(res.body.payload.length, 5);
        assert.equal(res.body.total, 5);
        assert.equal(res.body.page, 1);
        assert.equal(res.body.limit, 10);
        assert.equal(res.body.totalPages, 1);
        assert.equal(res.body.hasNextPage, false);
    });

    it('filtra por categoría (sin distinguir mayúsculas) y disponibilidad', async () => {
        const byCategory = await request('GET', '/api/services?category=salud');
        assert.deepEqual(byCategory.body.payload.map((s) => s.name).sort(), ['Consulta', 'Nutrición']);

        const both = await request('GET', '/api/services?category=salud&available=true');
        assert.deepEqual(both.body.payload.map((s) => s.name), ['Consulta']);

        const unavailable = await request('GET', '/api/services?available=false');
        assert.equal(unavailable.body.total, 2);
    });

    it('pagina con page y limit, y arma prevLink / nextLink conservando filtros', async () => {
        const res = await request('GET', '/api/services?limit=2&page=2&sortBy=price');
        assert.equal(res.body.payload.length, 2);
        assert.equal(res.body.totalPages, 3);
        assert.equal(res.body.prevPage, 1);
        assert.equal(res.body.nextPage, 3);
        assert.equal(res.body.prevLink, '/api/services?limit=2&page=1&sortBy=price');
        assert.equal(res.body.nextLink, '/api/services?limit=2&page=3&sortBy=price');
    });

    it('ordena por precio ascendente y descendente', async () => {
        const asc = await request('GET', '/api/services?sortBy=price&order=asc');
        assert.deepEqual(asc.body.payload.map((s) => s.price), [1500, 3000, 4000, 5000, 6500]);
        const desc = await request('GET', '/api/services?sortBy=price&order=desc');
        assert.deepEqual(desc.body.payload.map((s) => s.price), [6500, 5000, 4000, 3000, 1500]);
    });

    it('query params inválidos responden 400 (Zod)', async () => {
        for (const query of ['page=0', 'limit=500', 'sortBy=foo', 'order=up', 'available=si']) {
            const res = await request('GET', `/api/services?${query}`);
            assert.equal(res.status, 400, query);
        }
    });
});

describe('Reservas', () => {
    it('POST /api/bookings crea una reserva (201) con status pending por defecto', async () => {
        const res = await request('POST', '/api/bookings', bookingData());
        assert.equal(res.status, 201);
        assert.equal(res.body.payload.status, 'pending');
        assert.deepEqual(res.body.payload.services, []);
    });

    it('POST /api/bookings valida los datos con Zod (400)', async () => {
        const res = await request('POST', '/api/bookings', bookingData({ clientEmail: 'no-email', date: '2026-02-30', time: '25:00' }));
        assert.equal(res.status, 400);
        assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['clientEmail', 'date', 'time']);
        assert.equal(await BookingModel.countDocuments(), 0);
    });

    it('la reserva guarda sólo { service: ObjectId, quantity } y agrupa servicios repetidos', async () => {
        const service = await createService();
        const booking = await createBooking({
            services: [{ service: service._id, quantity: 2 }, { service: service._id }]
        });
        assert.equal(booking.services.length, 1);
        assert.equal(booking.services[0].quantity, 3);

        const raw = await BookingModel.collection.findOne({ _id: new mongoose.Types.ObjectId(booking._id) });
        assert.ok(raw.services[0].service instanceof mongoose.Types.ObjectId);
        assert.deepEqual(Object.keys(raw.services[0]).sort(), ['quantity', 'service']);
    });

    it('POST /api/bookings con un servicio inexistente responde 400 y uno no disponible 409', async () => {
        assert.equal((await request('POST', '/api/bookings', bookingData({ services: [{ service: FAKE_ID }] }))).status, 400);
        const off = await createService({ available: false });
        assert.equal((await request('POST', '/api/bookings', bookingData({ services: [{ service: off._id }] }))).status, 409);
    });

    it('GET /api/bookings lista las reservas', async () => {
        await createBooking();
        await createBooking({ clientName: 'Ana' });
        const res = await request('GET', '/api/bookings');
        assert.equal(res.status, 200);
        assert.equal(res.body.payload.length, 2);
    });

    it('GET /api/bookings/:bid devuelve los servicios completos con populate', async () => {
        const service = await createService();
        const booking = await createBooking({ services: [{ service: service._id, quantity: 2 }] });

        const res = await request('GET', `/api/bookings/${booking._id}`);
        assert.equal(res.status, 200);
        const [item] = res.body.payload.services;
        assert.equal(item.quantity, 2);
        assert.equal(item.service._id, service._id);
        assert.equal(item.service.name, 'Masaje');
        assert.equal(item.service.price, 7000);

        assert.equal((await request('GET', `/api/bookings/${FAKE_ID}`)).status, 404);
    });

    it('POST /api/bookings/:bid/services/:sid agrega un servicio y, si ya estaba, incrementa quantity', async () => {
        const service = await createService();
        const booking = await createBooking();
        const url = `/api/bookings/${booking._id}/services/${service._id}`;

        const first = await request('POST', url);
        assert.equal(first.status, 200);
        assert.equal(first.body.payload.services[0].quantity, 1);

        const second = await request('POST', url, { quantity: 2 });
        assert.equal(second.body.payload.services.length, 1);
        assert.equal(second.body.payload.services[0].quantity, 3);

        assert.equal((await request('POST', `/api/bookings/${booking._id}/services/${FAKE_ID}`)).status, 404);
        assert.equal((await request('POST', `/api/bookings/${FAKE_ID}/services/${service._id}`)).status, 404);
        assert.equal((await request('POST', url, { quantity: 0 })).status, 400);
        assert.equal((await request('POST', `/api/bookings/x/services/${service._id}`)).status, 400);
    });

    it('PUT /api/bookings/:bid/services/:sid modifica la cantidad', async () => {
        const service = await createService();
        const booking = await createBooking({ services: [{ service: service._id }] });
        const url = `/api/bookings/${booking._id}/services/${service._id}`;

        const res = await request('PUT', url, { quantity: 5 });
        assert.equal(res.status, 200);
        assert.equal(res.body.payload.services[0].quantity, 5);

        assert.equal((await request('PUT', url, {})).status, 400);
        const other = await createService({ name: 'Otro' });
        assert.equal((await request('PUT', `/api/bookings/${booking._id}/services/${other._id}`, { quantity: 1 })).status, 404);
    });

    it('DELETE /api/bookings/:bid/services/:sid quita un servicio de la reserva', async () => {
        const a = await createService({ name: 'A' });
        const b = await createService({ name: 'B' });
        const booking = await createBooking({ services: [{ service: a._id }, { service: b._id }] });

        const res = await request('DELETE', `/api/bookings/${booking._id}/services/${a._id}`);
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.payload.services.map((s) => String(s.service)), [b._id]);
        assert.equal((await request('DELETE', `/api/bookings/${booking._id}/services/${a._id}`)).status, 404);
    });

    it('DELETE /api/bookings/:bid/services vacía la reserva sin eliminarla', async () => {
        const service = await createService();
        const booking = await createBooking({ services: [{ service: service._id, quantity: 4 }] });

        const res = await request('DELETE', `/api/bookings/${booking._id}/services`);
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.payload.services, []);
        assert.equal(await BookingModel.countDocuments(), 1);
    });

    it('PUT /api/bookings/:bid actualiza los datos y DELETE /api/bookings/:bid elimina la reserva', async () => {
        const booking = await createBooking();

        const updated = await request('PUT', `/api/bookings/${booking._id}`, { status: 'confirmed', time: '11:00' });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.payload.status, 'confirmed');
        assert.equal(updated.body.payload.time, '11:00');
        assert.equal((await request('PUT', `/api/bookings/${booking._id}`, { status: 'otro' })).status, 400);

        assert.equal((await request('DELETE', `/api/bookings/${booking._id}`)).status, 200);
        assert.equal(await BookingModel.countDocuments(), 0);
        assert.equal((await request('DELETE', `/api/bookings/${booking._id}`)).status, 404);
    });

    it('una reserva cancelada no admite cambios en sus servicios (409)', async () => {
        const service = await createService();
        const booking = await createBooking({ status: 'cancelled' });
        assert.equal((await request('POST', `/api/bookings/${booking._id}/services/${service._id}`)).status, 409);
        assert.equal((await request('DELETE', `/api/bookings/${booking._id}/services`)).status, 409);
    });

    it('no se puede agregar un servicio no disponible (409)', async () => {
        const service = await createService({ available: false });
        const booking = await createBooking();
        assert.equal((await request('POST', `/api/bookings/${booking._id}/services/${service._id}`)).status, 409);
    });

    it('una ruta inexistente responde 404 en JSON', async () => {
        const res = await request('GET', '/api/no-existe');
        assert.equal(res.status, 404);
        assert.equal(res.body.status, 'error');
    });
});

describe('Vistas con Handlebars', () => {
    it('/views/services lista los servicios de la base', async () => {
        await createService({ name: 'Limpieza Facial' });
        const res = await request('GET', '/views/services');
        assert.equal(res.status, 200);
        assert.match(res.body, /Limpieza Facial/);
        assert.match(res.body, /socket\.io\/socket\.io\.js/);
    });

    it('/views/availability separa servicios disponibles y muestra las reservas', async () => {
        await createService({ name: 'Activo' });
        await createService({ name: 'Pausado', available: false });
        await createBooking({ clientName: 'Laura Gómez' });
        const res = await request('GET', '/views/availability');
        assert.equal(res.status, 200);
        assert.match(res.body, /Activo/);
        assert.match(res.body, /Pausado/);
        assert.match(res.body, /Laura Gómez/);
    });

    it('/views/bookings/:bid muestra la reserva con servicios populados y el total', async () => {
        const service = await createService({ name: 'Masaje', price: 7000 });
        const booking = await createBooking({ services: [{ service: service._id, quantity: 2 }] });
        const res = await request('GET', `/views/bookings/${booking._id}`);
        assert.equal(res.status, 200);
        assert.match(res.body, /Masaje/);
        assert.match(res.body, /\$14000/);

        assert.equal((await request('GET', `/views/bookings/${FAKE_ID}`)).status, 404);
    });

    it('/ redirige a /views', async () => {
        const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
        assert.equal(res.status, 302);
        assert.equal(res.headers.get('location'), '/views');
    });
});

describe('Tiempo real con Socket.io', () => {
    let socket;

    before(async () => {
        socket = ioClient(baseUrl, { transports: ['websocket'] });
        await new Promise((resolve) => socket.on('connect', resolve));
    });

    after(() => socket.close());

    const nextEvent = (name) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No llegó el evento ${name}`)), 3000);
        socket.once(name, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });

    it('crear o modificar un servicio emite servicesUpdated con el listado', async () => {
        const created = nextEvent('servicesUpdated');
        const service = await createService({ name: 'En vivo' });
        assert.deepEqual((await created).map((s) => s.name), ['En vivo']);

        const updated = nextEvent('servicesUpdated');
        await request('PUT', `/api/services/${service._id}`, { available: false });
        assert.equal((await updated)[0].available, false);
    });

    it('crear una reserva o agregarle servicios emite bookingsUpdated', async () => {
        const service = await createService();

        const created = nextEvent('bookingsUpdated');
        const booking = await createBooking({ clientName: 'Socket' });
        assert.equal((await created)[0].clientName, 'Socket');

        const added = nextEvent('bookingsUpdated');
        await request('POST', `/api/bookings/${booking._id}/services/${service._id}`);
        assert.equal((await added)[0].services[0].quantity, 1);
    });
});

describe('Arquitectura en capas', () => {
    const readLayer = async (dir) => {
        const files = (await readdir(path.join(ROOT, 'src', dir))).filter((f) => f.endsWith('.js'));
        return Promise.all(files.map(async (f) => ({ file: `${dir}/${f}`, code: await readFile(path.join(ROOT, 'src', dir, f), 'utf8') })));
    };

    it('existen todas las capas: routes, controllers, services, repositories, dao, models, config, validations y views', async () => {
        for (const dir of ['routes', 'controllers', 'services', 'repositories', 'dao', 'dao/models', 'config', 'validations', 'views', 'middlewares', 'sockets']) {
            assert.ok((await readdir(path.join(ROOT, 'src', dir))).length > 0, dir);
        }
    });

    it('los routers sólo conectan endpoints con middlewares y controllers', async () => {
        for (const { file, code } of await readLayer('routes')) {
            assert.doesNotMatch(code, /from '\.\.\/(services|repositories|dao)\//, file);
        }
    });

    it('los controllers no acceden a la base (sin mongoose, models, DAO ni repositories)', async () => {
        for (const { file, code } of await readLayer('controllers')) {
            assert.doesNotMatch(code, /mongoose|\/dao\/|\/repositories\//, file);
        }
    });

    it('los services tienen la lógica de negocio sin req/res ni Mongoose', async () => {
        for (const { file, code } of await readLayer('services')) {
            assert.doesNotMatch(code, /\breq\b|\bres\b|mongoose|\/dao\//, file);
            assert.match(code, /from '\.\.\/repositories\//, file);
        }
    });

    it('los repositories delegan en el DAO y sólo el DAO usa los models', async () => {
        for (const { file, code } of await readLayer('repositories')) {
            assert.match(code, /from '\.\.\/dao\//, file);
            assert.doesNotMatch(code, /models\//, file);
        }
        for (const { file, code } of await readLayer('dao')) {
            assert.match(code, /from '\.\/models\//, file);
        }
    });
});

describe('Entrega', () => {
    it('.gitignore excluye node_modules y .env, y existe .env.example con las variables', async () => {
        const gitignore = await readFile(path.join(ROOT, '.gitignore'), 'utf8');
        assert.match(gitignore, /^node_modules\/?$/m);
        assert.match(gitignore, /^\.env$/m);

        const example = await readFile(path.join(ROOT, '.env.example'), 'utf8');
        for (const name of ['PORT', 'NODE_ENV', 'MONGO_URI']) {
            assert.match(example, new RegExp(`^${name}=`, 'm'));
        }
    });
});
