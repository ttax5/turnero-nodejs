import app from './app.js';
import config from "./config/env.config.js";
import connectDB from './config/database.config.js';

const startServer = async () => {
    await connectDB();
    app.listen(config.port, () => {
        console.log(`Servidor escuchando en el puerto ${config.port}`);
    });
};
startServer();