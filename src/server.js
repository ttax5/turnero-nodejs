import { createServer } from 'node:http';
import app from './app.js';
import config from "./config/env.config.js";
import connectDB from './config/database.config.js';
import { initSocketServer } from './sockets/socket.js';

const startServer = async () => {
    await connectDB();

    // Socket.io necesita el servidor HTTP que envuelve a Express
    const httpServer = createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(config.port, () => {
        console.log(`Servidor escuchando en el puerto ${config.port}`);
    });
};
startServer();
