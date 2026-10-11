import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Variables obligatorias: si falta alguna, la app no arranca (fail-fast)
const REQUIRED_VARS = ['PORT', 'NODE_ENV', 'MONGO_URI'];

const missing = REQUIRED_VARS.filter(name => !process.env[name] || process.env[name].trim() === '');
if (missing.length > 0) {
    console.error(`❌ FATAL ERROR: faltan variables de entorno obligatorias: ${missing.join(', ')}.`);
    console.error('   Copiá .env.example a .env y completá los valores.');
    process.exit(1);
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) {
    console.error(`❌ FATAL ERROR: PORT debe ser un número entero positivo (valor actual: "${process.env.PORT}").`);
    process.exit(1);
}

const config = {
    port,
    nodeEnv: process.env.NODE_ENV.trim(),
    mongoUri: process.env.MONGO_URI.trim()
};

export default config;
