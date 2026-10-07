// Tests de la API (node:test, sin dependencias externas). Ejecutar con: npm test
// Levantan la app en un puerto libre, prueban todos los endpoints y verifican la
// separación de responsabilidades. Los archivos src/data/*.json se respaldan antes
// y se restauran al terminar, así que no modifican los datos del proyecto.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataFiles = ['services.json', 'bookings.json'].map(f => path.join(root, 'src', 'data', f));
const backups = new Map();

let server;
let baseUrl;

const request = async (method, url, body) => {
    const response = await fetch(baseUrl + url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    return { status: response.status, body: await response.json() };
};

const readSource = (relativePath) => fs.readFile(path.join(root, relativePath), 'utf-8');

const validService = {
    name: 'Sesión de Fisioterapia',
    description: 'Rehabilitación muscular',
    duration: 45,
    price: 5500,
    category: 'Salud',
    available: true
};

before(async () => {
    for (const file of dataFiles) {
        backups.set(file, await fs.readFile(file, 'utf-8'));
    }
    const { default: app } = await import('../src/app.js');
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
    server?.close();
    for (const [file, content] of backups) {
        await fs.writeFile(file, content);
    }
});

describe('Organización de rutas con Express Router', () => {
    test('cada recurso tiene su router con express.Router() y app.js sólo los monta', async () => {
        for (const file of ['src/routes/services.router.js', 'src/routes/bookings.router.js']) {
            assert.match(await readSource(file), /Router\(\)/);
        }
        const app = await readSource('src/app.js');
        assert.match(app, /app\.use\('\/api\/services', servicesRouter\)/);
        assert.match(app, /app\.use\('\/api\/bookings', bookingsRouter\)/);
    });
});

describe('Separación de responsabilidades', () => {
    test('los routers no tienen lógica: sólo conectan endpoints con controllers', async () => {
        for (const file of ['src/routes/services.router.js', 'src/routes/bookings.router.js']) {
            const source = await readSource(file);
            assert.doesNotMatch(source, /Manager|req\.|res\.|fs\./, `${file} no debería tener lógica`);
        }
    });

    test('los controllers no acceden a los archivos JSON', async () => {
        for (const file of ['src/controllers/services.controller.js', 'src/controllers/bookings.controller.js']) {
            const source = await readSource(file);
            assert.doesNotMatch(source, /from 'fs'|fs\.promises|\.json'/, `${file} no debería usar FileSystem`);
        }
    });

    test('los managers no usan req ni res', async () => {
        for (const file of ['src/managers/ServiceManager.js', 'src/managers/BookingManager.js']) {
            const source = await readSource(file);
            assert.doesNotMatch(source, /\breq\b|\bres\b/, `${file} no debería conocer req/res`);
        }
    });

    test('el filtro y la validación de campos viven sólo en el manager', async () => {
        const controller = await readSource('src/controllers/services.controller.js');
        assert.doesNotMatch(controller, /\.filter\(/, 'el controller no debería filtrar');
        assert.doesNotMatch(controller, /obligatorio/i, 'el controller no debería validar campos');
    });
});

describe('Endpoints de services', () => {
    let createdId;

    test('POST /api/services crea un servicio con id autogenerado (201)', async () => {
        const { status, body } = await request('POST', '/api/services', { ...validService, id: 'no-se-usa' });
        assert.equal(status, 201);
        assert.equal(body.status, 'success');
        assert.ok(body.payload.id);
        assert.notEqual(body.payload.id, 'no-se-usa');
        assert.equal(body.payload.name, validService.name);
        createdId = body.payload.id;
    });

    test('POST /api/services con campos faltantes responde 400', async () => {
        const { status, body } = await request('POST', '/api/services', { name: 'Incompleto' });
        assert.equal(status, 400);
        assert.equal(body.status, 'error');
        assert.match(body.message, /description, duration, price, category, available/);
    });

    test('POST /api/services con tipos inválidos responde 400', async () => {
        const { status } = await request('POST', '/api/services', { ...validService, price: 'caro' });
        assert.equal(status, 400);
    });

    test('GET /api/services lista todos los servicios (200)', async () => {
        const { status, body } = await request('GET', '/api/services');
        assert.equal(status, 200);
        assert.ok(body.payload.some(s => s.id === createdId));
    });

    test('GET /api/services?category= filtra por categoría sin distinguir mayúsculas', async () => {
        const { body } = await request('GET', '/api/services?category=SALUD');
        assert.ok(body.payload.length > 0);
        assert.ok(body.payload.every(s => s.category.toLowerCase() === 'salud'));
    });

    test('GET /api/services?available= filtra por disponibilidad', async () => {
        await request('PUT', `/api/services/${createdId}`, { available: false });
        const { body: unavailable } = await request('GET', '/api/services?available=false');
        assert.ok(unavailable.payload.some(s => s.id === createdId));
        assert.ok(unavailable.payload.every(s => s.available === false));
        const { body: available } = await request('GET', '/api/services?available=true');
        assert.ok(available.payload.every(s => s.available === true));
        await request('PUT', `/api/services/${createdId}`, { available: true });
    });

    test('GET /api/services?available=quizas responde 400', async () => {
        const { status } = await request('GET', '/api/services?available=quizas');
        assert.equal(status, 400);
    });

    test('GET /api/services/:sid devuelve el servicio (200) o 404 si no existe', async () => {
        const found = await request('GET', `/api/services/${createdId}`);
        assert.equal(found.status, 200);
        assert.equal(found.body.payload.id, createdId);
        const missing = await request('GET', '/api/services/no-existe');
        assert.equal(missing.status, 404);
    });

    test('PUT /api/services/:sid actualiza sin permitir cambiar el id', async () => {
        const { status, body } = await request('PUT', `/api/services/${createdId}`, { price: 6000, id: 'otro' });
        assert.equal(status, 200);
        assert.equal(body.payload.price, 6000);
        assert.equal(body.payload.id, createdId);
    });

    test('PUT /api/services/:sid responde 400 sin campos y 404 si no existe', async () => {
        assert.equal((await request('PUT', `/api/services/${createdId}`, {})).status, 400);
        assert.equal((await request('PUT', '/api/services/no-existe', { price: 1 })).status, 404);
    });

    test('DELETE /api/services/:sid elimina (200) y luego responde 404', async () => {
        assert.equal((await request('DELETE', `/api/services/${createdId}`)).status, 200);
        assert.equal((await request('DELETE', `/api/services/${createdId}`)).status, 404);
    });
});

describe('Endpoints de bookings', () => {
    let serviceId;
    let bookingId;

    before(async () => {
        serviceId = (await request('POST', '/api/services', validService)).body.payload.id;
    });

    test('POST /api/bookings crea una reserva con services vacío (201)', async () => {
        const { status, body } = await request('POST', '/api/bookings', {
            clientName: 'Juan Pérez',
            clientEmail: 'juan@example.com',
            date: '2026-10-10',
            time: '10:00'
        });
        assert.equal(status, 201);
        assert.ok(body.payload.id);
        assert.deepEqual(body.payload.services, []);
        bookingId = body.payload.id;
    });

    test('POST /api/bookings con campos faltantes responde 400', async () => {
        const { status, body } = await request('POST', '/api/bookings', { clientName: 'Ana' });
        assert.equal(status, 400);
        assert.match(body.message, /clientEmail, date, time/);
    });

    test('POST /api/bookings con un servicio inexistente responde 400', async () => {
        const { status } = await request('POST', '/api/bookings', {
            clientName: 'Ana', clientEmail: 'ana@example.com', date: '2026-10-10', time: '11:00',
            services: [{ service: 'no-existe' }]
        });
        assert.equal(status, 400);
    });

    test('GET /api/bookings/:bid devuelve la reserva (200) o 404 si no existe', async () => {
        assert.equal((await request('GET', `/api/bookings/${bookingId}`)).status, 200);
        assert.equal((await request('GET', '/api/bookings/no-existe')).status, 404);
    });

    test('POST /api/bookings/:bid/services/:sid guarda sólo { service, quantity } e incrementa quantity', async () => {
        const first = await request('POST', `/api/bookings/${bookingId}/services/${serviceId}`);
        assert.equal(first.status, 200);
        assert.deepEqual(first.body.payload.services, [{ service: serviceId, quantity: 1 }]);

        const second = await request('POST', `/api/bookings/${bookingId}/services/${serviceId}`, { quantity: 2 });
        assert.deepEqual(second.body.payload.services, [{ service: serviceId, quantity: 3 }]);
    });

    test('POST /api/bookings/:bid/services/:sid responde 404 si la reserva o el servicio no existen', async () => {
        assert.equal((await request('POST', `/api/bookings/no-existe/services/${serviceId}`)).status, 404);
        assert.equal((await request('POST', `/api/bookings/${bookingId}/services/no-existe`)).status, 404);
    });

    test('POST /api/bookings/:bid/services/:sid con quantity inválida responde 400', async () => {
        const { status } = await request('POST', `/api/bookings/${bookingId}/services/${serviceId}`, { quantity: 0 });
        assert.equal(status, 400);
    });

    test('los cambios quedan persistidos en src/data/bookings.json', async () => {
        const bookings = JSON.parse(await fs.readFile(dataFiles[1], 'utf-8'));
        const saved = bookings.find(b => b.id === bookingId);
        assert.deepEqual(saved.services, [{ service: serviceId, quantity: 3 }]);
    });
});

describe('Errores generales', () => {
    test('una ruta inexistente responde 404 en JSON', async () => {
        const { status, body } = await request('GET', '/api/no-existe');
        assert.equal(status, 404);
        assert.equal(body.status, 'error');
    });

    test('un body con JSON mal formado responde 400 en JSON', async () => {
        const response = await fetch(`${baseUrl}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"name":'
        });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).status, 'error');
    });
});
