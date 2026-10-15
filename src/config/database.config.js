import mongoose from 'mongoose';
import config from './env.config.js';

// Conexión centralizada a MongoDB Atlas. Si falla, el proceso termina:
// MongoDB es la persistencia principal y no tiene sentido levantar la API sin ella.
export const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log(`✅ Conexión a MongoDB exitosa (db: ${mongoose.connection.name})`);
    } catch (error) {
        console.error('❌ Error al conectar con MongoDB:', error.message);
        process.exit(1);
    }
};

export default connectDB;
