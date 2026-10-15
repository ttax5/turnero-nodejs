// Middlewares genéricos de validación con Zod. Cortan el flujo con 400 antes de
// llegar al controller (y por lo tanto antes de llegar a MongoDB).

const formatIssues = (error) => error.issues.map((issue) => ({
    field: issue.path.join('.') || null,
    message: issue.message
}));

const sendValidationError = (res, error) => {
    const errors = formatIssues(error);
    res.status(400).json({
        status: 'error',
        message: errors.map((e) => e.message).join('; '),
        errors
    });
};

// Valida req.body y lo reemplaza por los datos ya parseados (tipos convertidos,
// strings recortados y campos desconocidos descartados)
export const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return sendValidationError(res, result.error);
    req.body = result.data;
    next();
};

export const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return sendValidationError(res, result.error);
    next();
};

// En Express 5 req.query es de sólo lectura: el resultado se guarda en req.validatedQuery
export const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return sendValidationError(res, result.error);
    req.validatedQuery = result.data;
    next();
};
