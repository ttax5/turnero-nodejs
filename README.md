# Sistema Backend de Turnos y Reservas

API REST para administrar **servicios** reservables (consultas, sesiones, tratamientos, etc.) y **reservas** de clientes, con vistas simples renderizadas en el servidor y actualizaciones en tiempo real.

Proyecto final de *Programación Backend I* (Coderhouse).

## Tecnologías

| Tecnología | Uso |
|------------|-----|
| Node.js (ESM) | Entorno de ejecución, módulos `import` / `export` |
| Express 5 | Servidor HTTP, routers y middlewares; los errores de los controllers async llegan solos al manejador central |
| MongoDB Atlas + Mongoose 9 | Persistencia principal: schemas, models, referencias con `ObjectId` y `populate` |
| Zod 4 | Validación de `body`, `params` y `query` antes de llegar a la base de datos |
| Express Handlebars | Vistas renderizadas del lado del servidor |
| Socket.io 4 | Actualización de las vistas en tiempo real |
| dotenv | Configuración por variables de entorno |

## Funcionalidades

- **Servicios:** CRUD completo, y un listado con filtros (`category`, `available`), paginación (`page`, `limit`) y ordenamiento (`sortBy`, `order`).
- **Reservas:** crear, listar, consultar, actualizar datos y estado, y eliminar.
- **Servicios dentro de una reserva:** agregar un servicio (si ya estaba, se suma a su `quantity`), cambiar la cantidad, quitarlo o vaciar la reserva.
- **Relación por referencia:** la reserva guarda sólo `{ service: ObjectId, quantity }`. Al consultarla por id se usa `populate` para traer los datos completos de cada servicio.
- **Validación con Zod** en todos los endpoints que reciben datos. Si los datos son inválidos, se responde 400 con el detalle y sin tocar la base.
- **Reglas de negocio:** no se reservan servicios no disponibles, no se modifican los servicios de una reserva cancelada y no se elimina un servicio que forma parte de reservas activas.
- **Vistas con Handlebars:** listado de servicios, disponibilidad (servicios y reservas) y detalle de una reserva con subtotales y total.
- **Tiempo real con Socket.io:** las tres vistas se actualizan solas, sin recargar, cuando la API crea, modifica o elimina servicios o reservas.
- **Manejo centralizado de errores** con códigos HTTP consistentes (400, 404, 409 y 500).

## Requisitos

- Node.js 20 o superior.
- pnpm 11. El `pnpm-lock.yaml` usa el formato de pnpm 11; con versiones anteriores falla con `ERR_PNPM_BROKEN_LOCKFILE`.
- Un cluster en MongoDB Atlas, con un usuario de base de datos y tu IP habilitada en *Network Access*.

## Instalación y ejecución

```bash
git clone https://github.com/ttax5/turnero-nodejs.git
cd turnero-nodejs
pnpm install
cp .env.example .env      # completar MONGO_URI con la URI de tu cluster
pnpm run seed             # (opcional) carga 8 servicios y 1 reserva de ejemplo
pnpm run dev              # modo desarrollo (se reinicia con cada cambio); o: pnpm start
```

Con el servidor levantado:

- API: `http://localhost:8080/api/services` y `http://localhost:8080/api/bookings`
- Vistas: `http://localhost:8080/views`

### Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm start` | Levanta el servidor |
| `pnpm run dev` | Levanta el servidor con `node --watch` |
| `pnpm run seed` | Carga datos de ejemplo si la colección `services` está vacía |

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `8080` |
| `NODE_ENV` | Entorno | `development` |
| `MONGO_URI` | URI de conexión a MongoDB Atlas (obligatoria) | `mongodb+srv://user:pass@cluster.mongodb.net/booking_system` |

`.env.example` tiene la plantilla. El archivo `.env` no se sube al repositorio porque está en `.gitignore`. Si falta `MONGO_URI` o la conexión falla, la aplicación termina con un mensaje de error en vez de levantarse sin base de datos.

## Arquitectura

```
request → router → [middleware Zod] → controller → service → repository → DAO → model (Mongoose) → MongoDB Atlas
                                           │
                                           └─ notifica cambios → Socket.io → vistas Handlebars
```

| Capa | Responsabilidad |
|------|-----------------|
| Router | Define los endpoints y les conecta los middlewares de validación y el controller. No tiene lógica |
| Middleware de validación | Valida `body`, `params` y `query` con Zod; si algo no cumple, corta con 400 |
| Controller | Lee `req`, llama al service, responde con `res` y avisa a Socket.io si hubo cambios |
| Service | Reglas de negocio. Lanza errores tipados (`NotFoundError`, `ConflictError`, ...). No conoce `req`, `res` ni Mongoose |
| Repository | Interfaz de acceso a datos para los services, sin reglas de negocio |
| DAO | Único lugar que habla con MongoDB, a través de los models de Mongoose (consultas, paginación, `populate`) |
| Model | Schemas de Mongoose, que funcionan como segunda barrera de validación |
| Error middleware | Convierte cualquier error en una respuesta JSON con el código HTTP correcto |

```
src/
├── app.js                       # Express: middlewares, Handlebars, estáticos, routers y manejo de errores
├── server.js                    # Conecta a MongoDB, crea el servidor HTTP, inicia Socket.io y escucha
├── config/
│   ├── env.config.js            # Variables de entorno (valida MONGO_URI)
│   └── database.config.js       # Conexión centralizada a MongoDB
├── routes/
│   ├── services.router.js
│   ├── bookings.router.js
│   └── views.router.js          # Vistas (/views/...)
├── middlewares/
│   ├── validate.middleware.js   # validateBody / validateParams / validateQuery (Zod)
│   └── error.middleware.js      # 404 de rutas inexistentes y manejador centralizado de errores
├── validations/                 # Esquemas de Zod
│   ├── common.validation.js
│   ├── service.validation.js
│   └── booking.validation.js
├── controllers/
│   ├── services.controller.js
│   ├── bookings.controller.js
│   └── views.controller.js
├── services/                    # Lógica de negocio
│   ├── services.service.js
│   └── bookings.service.js
├── repositories/
│   ├── services.repository.js
│   └── bookings.repository.js
├── dao/
│   ├── services.dao.js
│   ├── bookings.dao.js
│   └── models/
│       ├── service.model.js
│       ├── booking.model.js
│       └── message.model.js
├── sockets/
│   └── socket.js                # Servidor Socket.io y funciones para notificar cambios
├── utils/
│   └── errors.js                # AppError, NotFoundError, BadRequestError, ConflictError
├── views/                       # Handlebars
│   ├── layouts/main.handlebars
│   ├── home.handlebars
│   ├── services.handlebars
│   ├── availability.handlebars
│   ├── booking-detail.handlebars
│   └── error.handlebars
├── public/
│   ├── css/styles.css
│   └── js/socket.js             # Cliente Socket.io: escucha eventos y redibuja la vista
└── scripts/
    └── seed.js                  # Datos de ejemplo
```

## Modelos

- **services:** `name`, `description`, `duration` (minutos), `price`, `category`, `available`, más `createdAt` y `updatedAt`.
- **bookings:** `clientName`, `clientEmail`, `date` (`YYYY-MM-DD`), `time` (`HH:mm`), `status` (`pending` | `confirmed` | `cancelled`; por defecto `pending`), `services`, más timestamps.
- **messages:** `user`, `message`, más timestamps.

### Relación reservas ↔ servicios

La reserva **no guarda el servicio completo**, sólo una referencia por `ObjectId` y la cantidad:

```js
services: [{ service: ObjectId /* ref: 'services' */, quantity: Number }]
```

Así, si cambia el precio o el nombre de un servicio, todas las reservas lo ven actualizado. Los datos completos se traen con `populate` sólo cuando se consulta una reserva por id.

## Endpoints

Todas las respuestas son JSON con la forma `{ status: "success", payload, ... }` o `{ status: "error", message }`. Los ids son `ObjectId` de MongoDB (campo `_id`).

### Servicios `/api/services`

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET | `/api/services` | Lista con filtros, paginación y ordenamiento | 200, 400 |
| GET | `/api/services/:sid` | Servicio por id | 200, 404 |
| POST | `/api/services` | Crea un servicio | 201, 400 |
| PUT | `/api/services/:sid` | Actualiza campos de un servicio (el id no se modifica) | 200, 400, 404 |
| DELETE | `/api/services/:sid` | Elimina un servicio | 200, 404, 409 si está en reservas activas |

### Reservas `/api/bookings`

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET | `/api/bookings` | Lista todas las reservas (con referencias, sin populate) | 200 |
| GET | `/api/bookings/:bid` | Reserva por id **con los servicios completos** (`populate`) | 200, 404 |
| POST | `/api/bookings` | Crea una reserva; `services` es opcional | 201, 400, 409 |
| PUT | `/api/bookings/:bid` | Actualiza cliente, email, fecha, hora o estado | 200, 400, 404 |
| DELETE | `/api/bookings/:bid` | Elimina la reserva | 200, 400, 404 |
| POST | `/api/bookings/:bid/services/:sid` | Agrega un servicio; body opcional `{ "quantity": n }`. Si ya estaba, se suma a su cantidad | 200, 400, 404, 409 |
| PUT | `/api/bookings/:bid/services/:sid` | Reemplaza la cantidad: body `{ "quantity": n }` | 200, 400, 404, 409 |
| DELETE | `/api/bookings/:bid/services/:sid` | Quita el servicio de la reserva | 200, 400, 404, 409 |
| DELETE | `/api/bookings/:bid/services` | Vacía la reserva: quita todos sus servicios y conserva la reserva | 200, 400, 404, 409 |

### Códigos de error

| Código | Cuándo |
|--------|--------|
| 400 | Datos que no pasan la validación de Zod, JSON mal formado, o un servicio inexistente en el body de `POST /api/bookings` |
| 404 | El servicio o la reserva no existe; el servicio no forma parte de la reserva; la ruta no existe |
| 409 | La operación choca con una regla de negocio (ver abajo) |
| 500 | Error inesperado del servidor (se registra en consola y no se exponen detalles) |

En `GET`, `PUT` y `DELETE` de `/api/services/:sid` y en `GET /api/bookings/:bid`, un id con formato inválido responde 404, igual que uno inexistente. En las demás rutas de reservas, el formato de los ids se valida con Zod y uno inválido responde 400.

## Reglas de negocio

Viven en `src/services/` y responden **409 Conflict** cuando no se cumplen:

| Regla | Dónde aplica |
|-------|--------------|
| No se puede reservar un servicio con `available: false` | Crear reserva con `services`, agregar un servicio a una reserva |
| No se pueden modificar los servicios de una reserva `cancelled` | Agregar, cambiar cantidad, quitar o vaciar |
| No se puede eliminar un servicio incluido en reservas no canceladas, porque dejaría referencias rotas. Para retirarlo de la oferta se lo marca como no disponible | `DELETE /api/services/:sid` |

Además:

- Agregar un servicio que ya está en la reserva **incrementa** su `quantity` en vez de duplicarlo. Lo mismo ocurre si `POST /api/bookings` repite un servicio en `services`.
- Una reserva nueva arranca en `pending`, salvo que se envíe otro `status`.

## Filtros, paginación y ordenamiento

`GET /api/services` acepta estos query params, todos opcionales:

| Param | Valores | Por defecto | Descripción |
|-------|---------|-------------|-------------|
| `category` | texto | — | Filtra por categoría, sin distinguir mayúsculas |
| `available` | `true` \| `false` | — | Filtra por disponibilidad |
| `page` | entero ≥ 1 | `1` | Página solicitada |
| `limit` | entero entre 1 y 100 | `10` | Resultados por página |
| `sortBy` | `name` \| `price` \| `duration` \| `category` \| `createdAt` | — (orden de creación) | Campo por el que se ordena |
| `order` | `asc` \| `desc` | `asc` | Sentido del orden |

```bash
GET /api/services?category=salud
GET /api/services?available=true
GET /api/services?page=2&limit=5
GET /api/services?sortBy=price&order=desc
GET /api/services?category=estetica&available=true&page=1&limit=10&sortBy=price&order=asc
```

La respuesta incluye el array de servicios en `payload` y los metadatos de paginación:

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

`prevLink` y `nextLink` conservan los demás filtros de la consulta. Un valor inválido, como `page=0`, `limit=500` o `sortBy=foo`, responde 400.

## Validaciones (Zod)

Los esquemas están en `src/validations/` y se aplican como middlewares en los routers. Por eso los datos inválidos se rechazan **antes** de llegar al controller y a MongoDB. Los schemas de Mongoose siguen validando como segunda barrera.

| Endpoint | Qué se valida |
|----------|---------------|
| `POST /api/services` | `name`, `description` y `category`: texto no vacío. `duration`: entero > 0. `price`: número ≥ 0. `available`: booleano. Todos son obligatorios |
| `PUT /api/services/:sid` | Los mismos campos, pero opcionales, y tiene que venir al menos uno. `_id` y los campos desconocidos se descartan |
| `POST /api/bookings` | `clientName`: texto no vacío. `clientEmail`: email válido. `date`: fecha real en formato `YYYY-MM-DD`. `time`: `HH:mm` (24 hs). `status` (opcional): `pending`, `confirmed` o `cancelled`. `services` (opcional): array de `{ service: ObjectId, quantity?: entero ≥ 1 }` |
| `PUT /api/bookings/:bid` | Los datos de la reserva, opcionales, y al menos uno |
| `POST /api/bookings/:bid/services/:sid` | `bid` y `sid`: ObjectId válidos. `quantity` (opcional): entero ≥ 1 |
| `PUT /api/bookings/:bid/services/:sid` | `quantity` (obligatorio): entero ≥ 1 |
| `GET /api/services` | Los query params de la sección anterior |

Los números y booleanos también se aceptan como string (`"60"`, `"true"`), lo que sirve para formularios. Ejemplo de error:

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

## Reserva con servicios completos (populate)

`GET /api/bookings/:bid` usa `populate('services.service')` (en `bookings.dao.js`) para reemplazar cada `ObjectId` por el documento del servicio:

```json
{
  "status": "success",
  "payload": {
    "_id": "6ac3f2887e6349b20eecac09",
    "clientName": "Laura Gómez",
    "clientEmail": "laura@example.com",
    "date": "2026-11-15",
    "time": "10:30",
    "status": "confirmed",
    "services": [
      {
        "service": {
          "_id": "6ac3f2887e6349b20eecac08",
          "name": "Masaje Descontracturante",
          "description": "Masaje de espalda y cuello",
          "duration": 60,
          "price": 7000,
          "category": "Bienestar",
          "available": true
        },
        "quantity": 2
      }
    ]
  }
}
```

Si un servicio referenciado fue eliminado (sólo puede pasar en reservas canceladas), su `service` aparece como `null`.

## Vistas (Handlebars)

| Ruta | Descripción |
|------|-------------|
| `/views` | Inicio. La raíz `/` redirige acá |
| `/views/services` | Listado de servicios: nombre, descripción, duración, precio, categoría y disponibilidad |
| `/views/availability` | Servicios disponibles y no disponibles, y todas las reservas. Cada reserva enlaza a su detalle |
| `/views/bookings/:bid` | Detalle de una reserva con sus servicios completos (`populate`), subtotales, duración total y precio total |

Las vistas no tienen datos hardcodeados: `views.controller.js` obtiene la información por las mismas capas que la API (`service → repository → DAO → model`).

## Tiempo real (Socket.io)

Socket.io comparte el servidor HTTP con Express (`server.js`). Cuando una acción de la API modifica datos, el controller avisa a todos los navegadores conectados:

| Acción en la API | Evento | Vistas que se actualizan |
|------------------|--------|--------------------------|
| Crear, actualizar o eliminar un servicio | `servicesUpdated`, con el listado completo de servicios | `/views/services`, `/views/availability` y `/views/bookings/:bid` (por ejemplo, si cambia un precio, se recalcula el total) |
| Crear, actualizar o eliminar una reserva, o agregar, cambiar o quitar sus servicios | `bookingsUpdated`, con el listado completo de reservas | `/views/availability` y `/views/bookings/:bid` |

`src/public/js/socket.js` escucha esos eventos y redibuja la vista sin recargar. Como el detalle de una reserva necesita los servicios populados, esa vista vuelve a pedir `GET /api/bookings/:bid` cuando recibe un evento. Si la reserva fue eliminada, muestra un aviso. El indicador **En vivo** muestra si el navegador está conectado.

### Cómo probarlo

1. Levantar el servidor y abrir `http://localhost:8080/views/availability`.
2. Cambiar la disponibilidad de un servicio desde Postman, Thunder Client o curl:
   ```bash
   curl -X PUT http://localhost:8080/api/services/<sid> -H "Content-Type: application/json" -d '{"available":false}'
   ```
   El servicio pasa a **No disponibles** sin recargar la página.
3. Hacer click en una reserva para abrir su detalle y, desde la API, agregarle un servicio o cambiar una cantidad. La tabla y el total se actualizan solos.

## Ejemplos con curl

```bash
# Crear un servicio
curl -X POST http://localhost:8080/api/services -H "Content-Type: application/json" \
  -d '{"name":"Masaje","description":"Descontracturante","duration":60,"price":8000,"category":"Bienestar","available":true}'

# Listar servicios de Salud disponibles, ordenados por precio
curl "http://localhost:8080/api/services?category=salud&available=true&sortBy=price&order=asc"

# Crear una reserva (con o sin servicios)
curl -X POST http://localhost:8080/api/bookings -H "Content-Type: application/json" \
  -d '{"clientName":"Juan Pérez","clientEmail":"juan@example.com","date":"2026-10-10","time":"10:00"}'

# Agregar un servicio (repetirlo suma a quantity)
curl -X POST http://localhost:8080/api/bookings/<bid>/services/<sid>

# Cambiar la cantidad de un servicio de la reserva
curl -X PUT http://localhost:8080/api/bookings/<bid>/services/<sid> -H "Content-Type: application/json" -d '{"quantity":3}'

# Quitar un servicio / vaciar la reserva
curl -X DELETE http://localhost:8080/api/bookings/<bid>/services/<sid>
curl -X DELETE http://localhost:8080/api/bookings/<bid>/services

# Confirmar la reserva
curl -X PUT http://localhost:8080/api/bookings/<bid> -H "Content-Type: application/json" -d '{"status":"confirmed"}'

# Consultar la reserva con los servicios completos
curl http://localhost:8080/api/bookings/<bid>

# Eliminar la reserva
curl -X DELETE http://localhost:8080/api/bookings/<bid>
```

## Checklist de pruebas manuales

- [ ] Crear, listar (con filtros, paginación y orden), consultar, actualizar y eliminar servicios
- [ ] Crear una reserva y consultarla con populate
- [ ] Agregar un servicio a la reserva (dos veces, para ver que se incrementa `quantity`)
- [ ] Modificar la cantidad de un servicio de la reserva
- [ ] Quitar un servicio de la reserva y vaciarla
- [ ] Actualizar el estado de la reserva y eliminarla
- [ ] Casos de error: servicio o reserva inexistente (404), datos inválidos (400), servicio no disponible o reserva cancelada (409)
- [ ] Vistas `/views/services`, `/views/availability` y `/views/bookings/:bid` actualizándose sin recargar
