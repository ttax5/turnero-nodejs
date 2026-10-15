// Errores de negocio con su código HTTP. Los lanzan los services y los traduce
// a respuesta el manejador centralizado de errores (src/middlewares/error.middleware.js).
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
    }
}

// El recurso pedido no existe → 404
export class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404);
    }
}

// Los datos enviados no son válidos para la operación → 400
export class BadRequestError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

// La operación choca con el estado actual de los datos → 409
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}
