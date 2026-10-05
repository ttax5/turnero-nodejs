import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI
};

if (!config.mongoUri) {
    console.error('❌ FATAL ERROR: falta configurar MONGO_URI en las variables de entorno (.env).');
    process.exit(1);
}

export default config;
