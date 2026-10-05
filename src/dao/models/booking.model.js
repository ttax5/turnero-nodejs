import mongoose from 'mongoose';

const bookingServiceSchema = new mongoose.Schema(
    {
        // Referencia al documento de la colección services (no se embebe el servicio completo)
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'services', required: true },
        quantity: { type: Number, default: 1, min: 1 }
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema(
    {
        clientName: { type: String, required: true, trim: true },
        clientEmail: { type: String, required: true, trim: true, lowercase: true },
        date: { type: String, required: true },   // YYYY-MM-DD (mismo formato que en la versión JSON)
        time: { type: String, required: true },   // HH:mm
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'pending'
        },
        services: { type: [bookingServiceSchema], default: [] }
    },
    { timestamps: true }
);

export const BookingModel = mongoose.model('bookings', bookingSchema);
