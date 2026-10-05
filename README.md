# Sistema Backend de Turnos y Reservas

API REST con **Node.js + Express + MongoDB Atlas (Mongoose)**, organizada en arquitectura en capas.

> Pre-entrega 6: la persistencia migró de archivos JSON (FileSystem) a MongoDB Atlas. Los endpoints y su comportamiento externo no cambiaron; sólo se reemplazó la capa DAO.

## Requisitos

- Node.js 20+
- pnpm (o npm)
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
├── scripts/seed.js            # Datos iniciales
├── views/                     # Handlebars
├── app.js
└── server.js                  # Conecta a MongoDB y después levanta Express
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
