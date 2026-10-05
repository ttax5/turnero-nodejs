# Sistema Backend de Turnos y Reservas

API REST con **Node.js + Express + MongoDB Atlas (Mongoose)**, organizada en arquitectura en capas, con validación de datos con **Zod**, consultas con filtros / paginación / ordenamiento, relaciones con `populate`, vistas renderizadas con **Handlebars** y actualizaciones en tiempo real con **Socket.io**.

> Pre-entrega 8: `GET /api/services` con filtros, paginación y ordenamiento; validación con Zod en la creación/actualización de servicios, la creación de reservas y el agregado de servicios a una reserva; y `GET /api/bookings/:bid` con `populate` de los servicios.

## Requisitos

- Node.js 20+
- pnpm 11 (el `pnpm-lock.yaml` usa el formato de pnpm 11; con versiones anteriores falla con `ERR_PNPM_BROKEN_LOCKFILE`)
- Un cluster en MongoDB Atlas con usuario de base de datos y tu IP habilitada en *Network Access*

## Instalación y ejecución

```bash
git clone https://github.com/ttax5/turnero-nodejs.git
cd turnero-nodejs
pnpm install
cp .env.example .env      # completar MONGO_URI con la URI de tu cluster
pnpm run seed             # (opcional) carga servicios de ejemplo en la colección services
pnpm run dev              # o: pnpm start
```

### Variables de entorno

| Variable    | Descripción                                    | Ejemplo |
|-------------|------------------------------------------------|---------|
| `PORT`      | Puerto del servidor                            | `8080` |
| `NODE_ENV`  | Entorno                                        | `development` |
| `MONGO_URI` | URI de conexión a MongoDB Atlas (obligatoria)  | `mongodb+srv://user:pass@cluster.mongodb.net/booking_system` |

Si `MONGO_URI` no está definida o la conexión falla, la aplicación termina con error en lugar de levantar el servidor sin base de datos.

## Arquitectura

```
router → controller → service → repository → DAO → MongoDB (Mongoose models)
```

| Capa       | Responsabilidad |
|------------|-----------------|
| Router     | Define endpoints y los conecta al controller (y a los middlewares de validación) |
| Middleware de validación | Valida `body` / `params` / `query` con Zod y corta con 400 antes del controller |
| Controller | Lee `req`, llama al service y responde con `res` |
| Service    | Reglas de negocio y validaciones; no conoce `req`/`res` ni Mongoose |
| Repository | Interfaz de acceso a datos sin reglas de negocio |
| DAO        | Único punto que habla con MongoDB a través de los models de Mongoose |

Gracias a esta separación, la migración sólo tocó la capa DAO (antes `fs.promises` sobre JSON, ahora Mongoose). Controllers, services y routers quedaron prácticamente iguales.

```
src/
├── config/
│   ├── env.config.js          # Variables de entorno (valida MONGO_URI)
│   └── database.config.js     # Conexión centralizada a MongoDB
├── controllers/
├── middlewares/
│   └── validate.middleware.js # validateBody / validateParams / validateQuery (Zod)
├── validations/               # Esquemas de Zod
│   ├── common.validation.js
│   ├── service.validation.js
│   └── booking.validation.js
├── services/
├── repositories/
├── dao/
│   ├── models/
│   │   ├── service.model.js
│   │   ├── booking.model.js
│   │   └── message.model.js
│   ├── services.dao.js
│   └── bookings.dao.js
├── routes/
│   ├── services.router.js
│   ├── bookings.router.js
│   └── views.router.js        # Rutas de vistas (/views/...)
├── sockets/
│   └── socket.js              # Servidor Socket.io + funciones para notificar cambios
├── views/                     # Handlebars
│   ├── layouts/main.handlebars
│   ├── home.handlebars
│   ├── services.handlebars
│   ├── availability.handlebars
│   └── error.handlebars
├── public/                    # Archivos estáticos
│   ├── css/styles.css
│   └── js/socket.js           # Cliente Socket.io: escucha eventos y actualiza la vista
├── scripts/seed.js            # Datos iniciales
├── app.js
└── server.js                  # Conecta a MongoDB, crea el servidor HTTP, inicia Socket.io y escucha
```

## Modelos

**services**: `name`, `description`, `duration` (min), `price`, `category`, `available` + `createdAt`/`updatedAt`.

**bookings**: `clientName`, `clientEmail`, `date` (`YYYY-MM-DD`), `time` (`HH:mm`), `status` (`pending` | `confirmed` | `cancelled`), `services`.

**messages**: `user`, `message` + timestamps (queda listo para el chat con WebSockets).

### Relación reservas ↔ servicios

Una reserva no guarda el servicio completo, sino una referencia por `ObjectId` a la colección `services`:

```js
services: [{ service: ObjectId /* ref: 'services' */, quantity: Number }]
```

- Al crear una reserva con `services` o al agregar un servicio, se verifica que el servicio exista.
- Si el mismo servicio se agrega más de una vez, se incrementa `quantity` (regla de negocio en `bookings.service.js`).

## Vistas (Handlebars)

| Ruta | Descripción |
|------|-------------|
| `/views` | Inicio (la raíz `/` redirige acá) |
| `/views/services` | Listado de servicios con nombre, descripción, duración, precio, categoría y disponibilidad |
| `/views/availability` | Servicios disponibles / no disponibles y listado de reservas (cliente, fecha, hora, estado y cantidad de servicios) |

Las vistas no tienen datos hardcodeados: `views.controller.js` obtiene la información a través de las mismas capas que la API (`service → repository → DAO → model`).

## Tiempo real (Socket.io)

Socket.io comparte el servidor HTTP con Express (`server.js`). Cuando una acción real de la API modifica datos, el controller correspondiente notifica a todos los clientes conectados:

| Acción en la API | Evento emitido | Vista que se actualiza |
|------------------|----------------|------------------------|
| `POST /api/services`, `PUT /api/services/:sid`, `DELETE /api/services/:sid` | `servicesUpdated` (listado completo de servicios) | `/views/services` y `/views/availability` |
| `POST /api/bookings`, `POST /api/bookings/:bid/services/:sid` | `bookingsUpdated` (listado completo de reservas) | `/views/availability` |

`src/public/js/socket.js` escucha esos eventos y vuelve a dibujar la vista sin recargar la página. El indicador **En vivo** muestra si el navegador está conectado.

### Cómo probarlo

1. Levantar el servidor (`pnpm run dev`) y abrir `http://localhost:8080/views/availability` en el navegador.
2. Desde Postman / Thunder Client / curl, cambiar la disponibilidad de un servicio:
   ```bash
   curl -X PUT http://localhost:8080/api/services/<sid> -H "Content-Type: application/json" -d '{"available":false}'
   ```
3. El servicio pasa a la columna **No disponibles** sin recargar la página. Lo mismo ocurre al crear o eliminar servicios, crear reservas o agregar servicios a una reserva.

## Endpoints

Los ids son `ObjectId` de MongoDB (campo `_id`). En `GET`/`PUT`/`DELETE` de servicios y en `GET` de reservas, un id con formato inválido responde 404, igual que uno inexistente. En `POST /api/bookings/:bid/services/:sid` los ids se validan con Zod y un formato inválido responde 400.

### Servicios `/api/services`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/services` | Lista servicios con filtros, paginación y ordenamiento (ver abajo) |
| GET    | `/api/services/:sid` | Servicio por id |
| POST   | `/api/services` | Crea un servicio (validado con Zod) |
| PUT    | `/api/services/:sid` | Actualiza campos de un servicio (validado con Zod; el id no se puede modificar) |
| DELETE | `/api/services/:sid` | Elimina un servicio |

### Reservas `/api/bookings`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/bookings` | Lista todas las reservas (con las referencias a servicios, sin populate) |
| POST   | `/api/bookings` | Crea una reserva (validado con Zod) |
| GET    | `/api/bookings/:bid` | Reserva por id **con los datos completos de cada servicio** (`populate`) |
| POST   | `/api/bookings/:bid/services/:sid` | Agrega un servicio (body opcional `{ "quantity": n }`, validado con Zod) |

## Filtros, paginación y ordenamiento

`GET /api/services` acepta estos query params (todos opcionales):

| Param | Valores | Por defecto | Descripción |
|-------|---------|-------------|-------------|
| `category` | texto | — | Filtra por categoría (sin distinguir mayúsculas) |
| `available` | `true` \| `false` | — | Filtra por disponibilidad |
| `page` | entero ≥ 1 | `1` | Página solicitada |
| `limit` | entero entre 1 y 100 | `10` | Resultados por página |
| `sortBy` | `name` \| `price` \| `duration` \| `category` \| `createdAt` | — (orden de creación) | Campo por el que se ordena |
| `order` | `asc` \| `desc` | `asc` | Sentido del orden |

Un valor inválido (por ejemplo `page=0`, `limit=500` o `sortBy=foo`) responde **400** con el detalle del error.

Ejemplos:

```bash
GET /api/services?category=salud
GET /api/services?available=true
GET /api/services?page=2&limit=5
GET /api/services?sortBy=price&order=desc
GET /api/services?category=estetica&available=true&page=1&limit=10&sortBy=price&order=asc
```

Respuesta (`payload` sigue siendo el array de servicios, más los metadatos de paginación):

```json
{
  "status": "success",
  "payload": [ { "_id": "...", "name": "Consulta Médica", "price": 5000, "...": "..." } ],
  "total": 12,
  "page": 2,
  "limit": 5,
  "totalPages": 3,
  "hasPrevPage": true,
  "hasNextPage": true,
  "prevPage": 1,
  "nextPage": 3,
  "prevLink": "/api/services?page=1&limit=5",
  "nextLink": "/api/services?page=3&limit=5"
}
```

`prevLink` y `nextLink` conservan los demás filtros de la consulta.

## Validaciones (Zod)

Los esquemas están en `src/validations/` y se aplican como middlewares en los routers (`validateBody`, `validateParams`, `validateQuery`), así que los datos inválidos se rechazan **antes** de llegar al controller y a MongoDB. Los modelos de Mongoose mantienen sus propias validaciones como segunda barrera.

| Endpoint | Qué se valida |
|----------|---------------|
| `POST /api/services` | `name`, `description`, `category`: texto no vacío · `duration`: entero > 0 · `price`: número ≥ 0 · `available`: booleano. Todos obligatorios |
| `PUT /api/services/:sid` | Los mismos campos, pero opcionales; al menos uno. `_id` y campos desconocidos se descartan |
| `POST /api/bookings` | `clientName`: texto no vacío · `clientEmail`: email válido · `date`: fecha real `YYYY-MM-DD` · `time`: `HH:mm` (24 hs) · `status` (opcional): `pending` \| `confirmed` \| `cancelled` · `services` (opcional): array de `{ service: ObjectId, quantity?: entero ≥ 1 }` |
| `POST /api/bookings/:bid/services/:sid` | `bid` y `sid`: ObjectId válidos · `quantity` (opcional): entero ≥ 1 |
| `GET /api/services` | Query params de la sección anterior |

Los números y booleanos también se aceptan como string (`"60"`, `"true"`), útil para formularios.

Ejemplo de error (400):

```json
{
  "status": "error",
  "message": "clientEmail debe ser un email válido; time debe tener formato HH:mm (24 hs)",
  "errors": [
    { "field": "clientEmail", "message": "clientEmail debe ser un email válido" },
    { "field": "time", "message": "time debe tener formato HH:mm (24 hs)" }
  ]
}
```

La validación revisa la **forma** de los datos. Las reglas de negocio siguen en la capa de services: que la reserva y el servicio existan (404 / 400) y que agregar un servicio repetido incremente `quantity`.

## Reserva con servicios completos (populate)

La reserva guarda sólo referencias (`{ service: ObjectId, quantity }`). Al consultarla por id, `bookings.dao.js` usa `populate('services.service')` para traer el documento completo de cada servicio:

```bash
curl http://localhost:8080/api/bookings/<bid>
```

```json
{
  "status": "success",
  "payload": {
    "_id": "6ac3f2887e6349b20eecac09",
    "clientName": "Ana",
    "clientEmail": "ana@x.com",
    "date": "2026-10-10",
    "time": "10:00",
    "status": "confirmed",
    "services": [
      {
        "service": {
          "_id": "6ac3f2887e6349b20eecac08",
          "name": "Masaje",
          "description": "Descontracturante",
          "duration": 60,
          "price": 9000,
          "category": "Bienestar",
          "available": true
        },
        "quantity": 2
      }
    ]
  }
}
```

Si un servicio referenciado fue eliminado, su `service` aparece como `null`.

## Ejemplos con curl

```bash
# Crear servicio
curl -X POST http://localhost:8080/api/services -H "Content-Type: application/json" \
  -d '{"name":"Masaje","description":"Descontracturante","duration":60,"price":8000,"category":"Bienestar","available":true}'

# Crear reserva
curl -X POST http://localhost:8080/api/bookings -H "Content-Type: application/json" \
  -d '{"clientName":"Juan Pérez","clientEmail":"juan@example.com","date":"2026-10-10","time":"10:00"}'

# Agregar servicio a la reserva (repetirlo incrementa quantity)
curl -X POST http://localhost:8080/api/bookings/<bid>/services/<sid>

# Consultar la reserva con los servicios completos
curl http://localhost:8080/api/bookings/<bid>
```
