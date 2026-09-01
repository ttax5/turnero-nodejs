# 📅 Sistema Backend de Turnos y Reservas - API con Express y FileSystem

Primera pre-entrega del proyecto integrador para el curso de Backend de Coderhouse. Servidor REST modular desarrollado en **Node.js** con arquitectura **ESM (ES Modules)**, **Express** y persistencia de datos mediante el módulo nativo **FileSystem (`fs/promises`)** en archivos JSON.

---

## 🚀 Características Principales

- **Gestión Completa de Servicios (CRUD)**: Creación, listado, búsqueda por ID, actualización y eliminación de servicios.
- **Gestión de Reservas y Turnos**: Creación y consulta de reservas con cliente, fecha, hora y estado.
- **Relación y Agregación de Servicios en Reservas**: Incorporación de servicios por ID a reservas existentes con control de cantidades acumulativas (`quantity`).
- **Persistencia en JSON**: Almacenamiento seguro en disco (`src/data/services.json` y `src/data/bookings.json`) sin pérdida de información tras reiniciar el servidor.
- **Separación de Responsabilidades**: Arquitectura limpia con Routers, Managers y Capa de Datos.
- **Validaciones Robustas y Manejo de Errores**: Códigos de estado HTTP semánticos (200, 201, 400, 404, 500).

---

## 📁 Estructura del Proyecto

```text
turnero-nodejs/
├── .env                       # Variables de entorno locales
├── .env.example               # Archivo de ejemplo para variables de entorno
├── .gitignore                 # Archivos y carpetas ignoradas por git
├── package.json               # Configuración del proyecto, dependencias y scripts
├── README.md                  # Documentación del proyecto
├── guia_clase_coderhouse.html # Guía interactiva completa de estudio de la clase
└── src/
    ├── app.js                 # Configuración de Express, middlewares y rutas
    ├── server.js              # Inicialización y puesta en marcha del servidor HTTP
    ├── config/
    │   └── env.config.js      # Configuración y validación de variables de entorno
    ├── data/
    │   ├── services.json      # Persistencia de servicios
    │   └── bookings.json      # Persistencia de reservas
    ├── managers/
    │   ├── ServiceManager.js  # Lógica de negocio y FileSystem para servicios
    │   └── BookingManager.js  # Lógica de negocio y FileSystem para reservas
    └── routes/
        ├── services.router.js # Endpoints para /api/services
        └── bookings.router.js # Endpoints para /api/bookings
```

---

## 🛠️ Requisitos e Instalación

### Requisitos previos
- **Node.js** (v18 o superior recomendado)
- **npm** o **pnpm**

### Pasos de instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd turnero-nodejs
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` (si aún no existe):
   ```bash
   cp .env.example .env
   ```
   *Contenido de `.env`:*
   ```env
   PORT=8080
   NODE_ENV=development
   ```

4. **Ejecutar el servidor:**
   - **Modo Desarrollo (con reinicio automático al guardar cambios):**
     ```bash
     npm run dev
     ```
   - **Modo Producción:**
     ```bash
     npm start
     ```

El servidor quedará disponible en `http://localhost:8080`.

---

## 📡 Documentación de la API (Endpoints)

### 🔹 Recurso: Servicios (`/api/services`)

| Método | Endpoint | Descripción | Status |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/services` | Devuelve la lista de todos los servicios | `200 OK` |
| **GET** | `/api/services/:sid` | Devuelve un servicio por su ID | `200 OK` / `404 Not Found` |
| **POST** | `/api/services` | Crea un nuevo servicio (ID autogenerado) | `201 Created` / `400 Bad Request` |
| **PUT** | `/api/services/:sid` | Actualiza un servicio existente (ID inmutable) | `200 OK` / `404 Not Found` |
| **DELETE** | `/api/services/:sid` | Elimina un servicio por ID | `200 OK` / `404 Not Found` |

#### Ejemplo Body para `POST /api/services`:
```json
{
  "name": "Sesión de Fisioterapia",
  "description": "Rehabilitación muscular y kinesiología",
  "duration": 60,
  "price": 4500,
  "category": "Salud",
  "available": true
}
```

---

### 🔹 Recurso: Reservas (`/api/bookings`)

| Método | Endpoint | Descripción | Status |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/bookings` | Devuelve todas las reservas | `200 OK` |
| **GET** | `/api/bookings/:bid` | Devuelve una reserva por su ID | `200 OK` / `404 Not Found` |
| **POST** | `/api/bookings` | Crea una nueva reserva | `201 Created` / `400 Bad Request` |
| **POST** | `/api/bookings/:bid/services/:sid` | Agrega un servicio a la reserva (incrementa cantidad si ya existe) | `200 OK` / `404 Not Found` |

#### Ejemplo Body para `POST /api/bookings`:
```json
{
  "clientName": "Juan Pérez",
  "clientEmail": "juan.perez@example.com",
  "date": "2026-09-15",
  "time": "15:30"
}
```

#### Respuesta de Reserva con Servicios Agregados:
```json
{
  "status": "success",
  "message": "Servicio 1 agregado a la reserva 1740358000000 exitosamente",
  "payload": {
    "id": "1740358000000",
    "clientName": "Juan Pérez",
    "clientEmail": "juan.perez@example.com",
    "date": "2026-09-15",
    "time": "15:30",
    "status": "confirmed",
    "services": [
      {
        "service": "1",
        "quantity": 2
      }
    ]
  }
}
```

---

## 🎓 Guía de Estudio HTML

Se incluye en la raíz del proyecto el archivo **`guia_clase_coderhouse.html`**, un documento interactivo y visualmente estructurado con explicaciones paso a paso de toda la teoría, arquitectura, código y flujo de datos de la clase.
