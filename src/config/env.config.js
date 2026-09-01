import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || 'development'
};

// Validación requerida por la consigna
if (!config.port || !config.nodeEnv) {
    console.error('❌ FATAL ERROR: PORT o NODE_ENV no están definidas en las variables de entorno.');
    process.exit(1);
}

export default config;
