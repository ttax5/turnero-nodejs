// Errores con código HTTP. Los lanzan los managers (que no conocen req/res)
// y los controllers los traducen a la respuesta con res.status(error.statusCode).

// Los datos enviados no son válidos → 400
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

// El recurso pedido no existe → 404
export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}
