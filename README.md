# Sistema Backend de Turnos y Reservas

API REST para gestionar **servicios** reservables (consultas, sesiones, tratamientos) y **reservas** de clientes, construida con **Node.js (ESM)**, **Express 5** y persistencia en archivos JSON con **FileSystem** (`fs.promises`).

> **Pre-entrega 4 · Organización de la API con Routers y Controllers.**
> La API se organiza en tres capas: **rutas** (`express.Router()`), **controllers** y **managers**. Los endpoints y su comportamiento externo se mantienen respecto de la entrega anterior.

---

## Tecnologías

- Node.js 18+ con ES Modules (`"type": "module"`)
- Express 5 (`express.Router()`)
- FileSystem (`fs.promises`) con archivos JSON como persistencia
- dotenv para las variables de entorno
- `node:test`, el runner nativo de Node, para los tests (sin dependencias extra)

---

## Estructura del proyecto

```text
turnero-nodejs/
├── .env.example                    # Variables de entorno necesarias (sin valores sensibles)
├── .gitignore                      # Ignora node_modules/ y .env
├── package.json                    # Scripts: start, dev, test
├── README.md
├── tests/
│   └── api.test.js                 # Tests de endpoints y de separación de capas (npm test)
└── src/
    ├── app.js                      # Configura Express, monta los routers y maneja 404 / JSON inválido
    ├── server.js                   # Levanta el servidor en el puerto de .env
    ├── config/
    │   └── env.config.js           # Carga y valida PORT y NODE_ENV (si falta alguna, la app no arranca)
    ├── routes/                     # CAPA 1: sólo define endpoints y los conecta con su controller
    │   ├── services.router.js
    │   └── bookings.router.js
    ├── controllers/                # CAPA 2: lee req, llama al manager y responde con res.status().json()
    │   ├── services.controller.js
    │   └── bookings.controller.js
    ├── managers/                   # CAPA 3: datos y validaciones con FileSystem (sin req ni res)
    │   ├── ServiceManager.js
    │   └── BookingManager.js
    ├── data/                       # Persistencia en JSON
    │   ├── services.json
    │   └── bookings.json
    └── utils/
        └── errors.js               # ValidationError (400) y NotFoundError (404)
```

---

## Instalación y ejecución

```bash
git clone https://github.com/ttax5/turnero-nodejs.git
cd turnero-nodejs
npm install                 # o: pnpm install (pnpm 11)
cp .env.example .env        # crea el .env local (no se sube al repo)
npm run dev                 # desarrollo, se reinicia con cada cambio
# o
npm start                   # ejecución normal
```

El servidor queda en `http://localhost:8080`.

### Variables de entorno

| Variable | Descripción | Valor de ejemplo |
|----------|-------------|------------------|
| `PORT` | Puerto del servidor (entero positivo) | `8080` |
| `NODE_ENV` | Entorno de ejecución | `development` |

`src/config/env.config.js` valida las variables al iniciar. Si falta alguna, o `PORT` no es un número válido, la aplicación **no arranca** y explica el problema:

```text
❌ FATAL ERROR: faltan variables de entorno obligatorias: PORT, NODE_ENV.
   Copiá .env.example a .env y completá los valores.
```

### Tests

```bash
npm test
```

Ejecuta 26 tests (`tests/api.test.js`) que levantan la API en un puerto libre y verifican todos los endpoints, los códigos HTTP, la persistencia y la separación de responsabilidades entre capas. Hacen backup de `src/data/*.json` y los restauran al terminar, así que no modifican los datos.

```text
# tests 26
# suites 5
# pass 26
# fail 0
```

---

## Arquitectura: separación de responsabilidades

```text
Cliente → Router → Controller → Manager → src/data/*.json
```

| Capa | Archivos | Hace | No hace |
|------|----------|------|---------|
| **Routes** | `src/routes/*.router.js` | Crea el router con `express.Router()` y conecta cada método y ruta con su controller | Lógica, validaciones ni acceso a datos |
| **Controllers** | `src/controllers/*.controller.js` | Lee `req.params`, `req.query` y `req.body`, llama al manager y responde con `res.status().json()`. Traduce los errores del manager a 400, 404 o 500 | Acceso a archivos JSON, filtros ni validación de campos |
| **Managers** | `src/managers/*Manager.js` | Lee y escribe los JSON, valida los datos (en un solo lugar), genera los ids, filtra y aplica las reglas de reservas | Uso de `req` ni `res` |

Ejemplos del flujo:

```text
POST /api/services
  → services.router.js              router.post('/', createService)
  → services.controller.js          createService: serviceManager.addService(req.body) → 201
  → ServiceManager.addService()     valida campos, genera id, escribe services.json

GET /api/services?category=salud&available=true
  → services.router.js              router.get('/', getServices)
  → services.controller.js          getServices: serviceManager.getServices({ category, available }) → 200
  → ServiceManager.getServices()    lee services.json y aplica los filtros

POST /api/bookings/:bid/services/:sid
  → bookings.router.js              router.post('/:bid/services/:sid', addServiceToBooking)
  → bookings.controller.js          addServiceToBooking: bookingManager.addServiceToBooking(bid, sid, quantity) → 200
  → BookingManager                  valida la reserva y el servicio (vía ServiceManager), incrementa quantity y escribe bookings.json
```

### Validaciones y errores

- Las validaciones de campos obligatorios y tipos están **sólo en los managers**: `validateServiceData()` en `ServiceManager.js` y `createBooking()` / `parseQuantity()` en `BookingManager.js`.
- Los managers lanzan `ValidationError` (400) o `NotFoundError` (404), definidos en `src/utils/errors.js`. Los controllers responden con `error.statusCode`.
- Cualquier error inesperado responde `500` con un mensaje genérico.

---

## Endpoints

Las respuestas tienen la forma `{ "status": "success", "payload": ... }` o `{ "status": "error", "message": "..." }`.

### Servicios: `/api/services`

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET | `/api/services` | Lista los servicios. Filtros opcionales: `?category=salud`, `?available=true` | 200 · 400 si `available` no es `true`/`false` |
| GET | `/api/services/:sid` | Servicio por id | 200 · 404 |
| POST | `/api/services` | Crea un servicio con id autogenerado (un `id` enviado en el body se ignora) | 201 · 400 |
| PUT | `/api/services/:sid` | Actualiza los campos enviados; el `id` no se puede modificar | 200 · 400 · 404 |
| DELETE | `/api/services/:sid` | Elimina el servicio | 200 · 404 |

Campos de un servicio: `name`, `description`, `duration` (minutos, > 0), `price` (≥ 0), `category` y `available` (booleano). Al crear, son todos obligatorios.

### Reservas: `/api/bookings`

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET | `/api/bookings` | Lista las reservas | 200 |
| GET | `/api/bookings/:bid` | Reserva por id | 200 · 404 |
| POST | `/api/bookings` | Crea una reserva (`services` es opcional y puede empezar vacío) | 201 · 400 |
| POST | `/api/bookings/:bid/services/:sid` | Agrega un servicio. Si ya estaba, **incrementa** `quantity`. Body opcional: `{ "quantity": n }` | 200 · 400 · 404 |

Campos obligatorios de una reserva: `clientName`, `clientEmail`, `date` y `time`. `status` es opcional (por defecto `confirmed`). La reserva guarda sólo la referencia a cada servicio: `services: [{ "service": "<id>", "quantity": 1 }]`.

### Ejemplos (salidas reales)

```bash
# Filtrar servicios por categoría
curl "http://localhost:8080/api/services?category=salud"
```
```json
{"status":"success","payload":[{"id":"2","name":"Consulta Médica","description":"Evaluación médica general y diagnóstico","duration":45,"price":5000,"category":"Salud","available":true}]}
```

```bash
# Crear un servicio incompleto → 400
curl -X POST http://localhost:8080/api/services -H "Content-Type: application/json" -d '{"name":"Masaje"}'
```
```json
{"status":"error","message":"Faltan campos obligatorios: description, duration, price, category, available"}
```

```bash
# Crear un servicio
curl -X POST http://localhost:8080/api/services -H "Content-Type: application/json" \
  -d '{"name":"Masaje","description":"Descontracturante","duration":60,"price":7000,"category":"Bienestar","available":true}'
```
```json
{"status":"success","message":"Servicio creado exitosamente","payload":{"id":"d4c4a54d-0c2a-466f-a0e3-45281cd7a0bb","name":"Masaje","description":"Descontracturante","duration":60,"price":7000,"category":"Bienestar","available":true}}
```

```bash
# Crear una reserva
curl -X POST http://localhost:8080/api/bookings -H "Content-Type: application/json" \
  -d '{"clientName":"Juan","clientEmail":"juan@example.com","date":"2026-10-10","time":"10:00"}'

# Agregar el mismo servicio dos veces → quantity 2
curl -X POST http://localhost:8080/api/bookings/<bid>/services/<sid>
curl -X POST http://localhost:8080/api/bookings/<bid>/services/<sid>
```
```json
{"status":"success","message":"Servicio d4c4a54d-0c2a-466f-a0e3-45281cd7a0bb agregado a la reserva 91168e19-ec4a-418d-8fde-53ba818f3ff5 exitosamente","payload":{"id":"91168e19-ec4a-418d-8fde-53ba818f3ff5","clientName":"Juan","clientEmail":"juan@example.com","date":"2026-10-10","time":"10:00","status":"confirmed","services":[{"service":"d4c4a54d-0c2a-466f-a0e3-45281cd7a0bb","quantity":2}]}}
```

```bash
# Servicio inexistente → 404
curl http://localhost:8080/api/services/no-existe
```
```json
{"status":"error","message":"No se encontró el servicio con el id: no-existe"}
```

---

## Criterios de evaluación y evidencia

| Criterio | Dónde verlo | Evidencia verificable |
|----------|-------------|-----------------------|
| **Organización de rutas con Express Router** (20%) | `src/routes/services.router.js` y `src/routes/bookings.router.js` usan `Router()`. `src/app.js` los monta con `app.use('/api/services', ...)` y `app.use('/api/bookings', ...)` | Test *"cada recurso tiene su router con express.Router() y app.js sólo los monta"* |
| **Implementación de controllers** (25%) | `src/controllers/services.controller.js`: `getServices`, `getServiceById`, `createService`, `updateService`, `deleteService`. `src/controllers/bookings.controller.js`: `createBooking`, `getBookingById`, `addServiceToBooking` (más `getBookings`) | Suites *"Endpoints de services"* y *"Endpoints de bookings"* |
| **Separación de responsabilidades** (25%) | Routers sin lógica. Controllers sin `fs`, sin filtros y sin validación de campos. Managers sin `req`/`res`. El filtro por `category`/`available` está en `ServiceManager.getServices()` y la validación, sólo en los managers | Suite *"Separación de responsabilidades"*: analiza el código fuente de cada capa |
| **Conservación de endpoints y comportamiento** (20%) | Las mismas URLs y métodos HTTP. Códigos 200, 201, 400 y 404. La persistencia en JSON se mantiene al reiniciar | 21 tests de endpoints, incluido *"los cambios quedan persistidos en src/data/bookings.json"*, más los ejemplos con curl de arriba |
| **Organización, documentación y entrega** (10%) | `.env.example`, `.gitignore` (`node_modules/`, `.env`) y este README con la estructura (incluye `controllers/`), instrucciones y endpoints. El repo no incluye `node_modules` ni `.env` | `git ls-files` no lista `.env` ni `node_modules` |

---

## Cambios respecto de la devolución anterior

- **Filtro de `category` y `available`:** pasó del controller a `ServiceManager.getServices(filters)`, que es la capa de datos.
- **Validación de campos obligatorios:** ahora está en un solo lugar, el manager (`validateServiceData()` y `createBooking()`). Los controllers ya no la repiten.
- **README:** muestra la carpeta `controllers/` y la estructura real del repo. Se quitaron archivos que no existían (`.env`, `guia_clase_coderhouse.html`).
- **Evidencia por criterio:** se agregaron instrucciones de ejecución, la tabla de criterios y evidencia, ejemplos con salidas reales y `npm test`.
- **`env.config.js`:** ahora valida de verdad. Antes, los valores por defecto hacían que nunca fallara.
- **`npm install`:** funciona. Antes `devEngines` lo hacía fallar con `EBADDEVENGINES`.
- **Validaciones nuevas en el manager:** al crear una reserva, cada servicio de `services` debe existir y se guarda sólo `{ service, quantity }`; `quantity` debe ser un entero ≥ 1.
- **JSON mal formado:** un body con JSON inválido responde 400 en JSON.
