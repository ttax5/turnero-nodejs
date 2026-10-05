import mongoose from 'mongoose';

// Modelo preparado para el chat / notificaciones del módulo de WebSockets
const messageSchema = new mongoose.Schema(
    {
        user: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true }
    },
    { timestamps: true }
);

export const MessageModel = mongoose.model('messages', messageSchema);
