# Sistema Backend de Turnos y Reservas

API REST con **Node.js + Express + MongoDB Atlas (Mongoose)**, organizada en arquitectura en capas, con vistas renderizadas con **Handlebars** y actualizaciones en tiempo real con **Socket.io**.

> Pre-entrega 7: se agregaron vistas del lado del servidor y comunicación en tiempo real. La API REST no cambió.

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
| Router     | Define endpoints y los conecta al controller |
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

Los ids ahora son `ObjectId` de MongoDB (campo `_id`). Un id con formato inválido responde 404, igual que uno inexistente.

### Servicios `/api/services`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/services` | Lista servicios. Filtros opcionales: `?category=salud&available=true` |
| GET    | `/api/services/:sid` | Servicio por id |
| POST   | `/api/services` | Crea un servicio |
| PUT    | `/api/services/:sid` | Actualiza campos de un servicio |
| DELETE | `/api/services/:sid` | Elimina un servicio |

### Reservas `/api/bookings`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/bookings` | Lista todas las reservas |
| POST   | `/api/bookings` | Crea una reserva |
| GET    | `/api/bookings/:bid` | Reserva por id |
| POST   | `/api/bookings/:bid/services/:sid` | Agrega un servicio (body opcional `{ "quantity": n }`) |

### Ejemplo

```bash
# Crear servicio
curl -X POST http://localhost:8080/api/services -H "Content-Type: application/json" \
  -d '{"name":"Masaje","description":"Descontracturante","duration":60,"price":8000,"category":"Bienestar","available":true}'

# Crear reserva
curl -X POST http://localhost:8080/api/bookings -H "Content-Type: application/json" \
  -d '{"clientName":"Juan Pérez","clientEmail":"juan@example.com","date":"2026-10-10","time":"10:00"}'

# Agregar servicio a la reserva (repetirlo incrementa quantity)
curl -X POST http://localhost:8080/api/bookings/<bid>/services/<sid>
```
