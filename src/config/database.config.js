import mongoose from "mongoose";
import config from "./env.config.js";

export const connectDB = async () => {
    if (!config.mongoURI) {
        console.log("ℹ️ MONGODB_URI no definida. Se utilizará exclusivamente persistencia en archivos JSON.");
        return;
    }

    try {
        await mongoose.connect(config.mongoURI);
        console.log("✅ Conexión a MongoDB exitosa");
    } catch (error) {
        console.warn("⚠️ No se pudo conectar a MongoDB. Continuando con persistencia JSON:", error.message);
    }
};

export default connectDB;
