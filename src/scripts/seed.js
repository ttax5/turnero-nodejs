// Carga datos de ejemplo en MongoDB: servicios y una reserva que los referencia.
// Uso: npm run seed  (no inserta nada si la colección ya tiene documentos)
import mongoose from 'mongoose';
import { connectDB } from '../config/database.config.js';
import { ServiceModel } from '../dao/models/service.model.js';
import { BookingModel } from '../dao/models/booking.model.js';

const services = [
    { name: 'Corte de Pelo', description: 'Corte masculino tradicional', duration: 30, price: 1500, category: 'Peluquería', available: true },
    { name: 'Coloración', description: 'Tintura completa con productos profesionales', duration: 90, price: 6500, category: 'Peluquería', available: true },
    { name: 'Consulta Médica', description: 'Evaluación médica general y diagnóstico', duration: 45, price: 5000, category: 'Salud', available: true },
    { name: 'Control Nutricional', description: 'Seguimiento de plan alimentario', duration: 30, price: 4000, category: 'Salud', available: false },
    { name: 'Sesión de Fisioterapia', description: 'Rehabilitación muscular y articular', duration: 45, price: 5500, category: 'Rehabilitación', available: true },
    { name: 'Masaje Descontracturante', description: 'Masaje de espalda y cuello', duration: 60, price: 7000, category: 'Bienestar', available: true },
    { name: 'Limpieza Facial', description: 'Limpieza profunda e hidratación', duration: 50, price: 4800, category: 'Estética', available: true },
    { name: 'Manicura', description: 'Manicura con esmaltado semipermanente', duration: 40, price: 3000, category: 'Estética', available: false }
];

await connectDB();

const existingServices = await ServiceModel.countDocuments();
if (existingServices > 0) {
    console.log(`ℹ️ La colección services ya tiene ${existingServices} documentos. No se insertó nada.`);
} else {
    const inserted = await ServiceModel.insertMany(services);
    console.log(`✅ ${inserted.length} servicios insertados:`);
    inserted.forEach(s => console.log(`   ${s._id}  ${s.name}`));

    if (await BookingModel.countDocuments() === 0) {
        // La reserva guarda sólo referencias (ObjectId) y cantidades
        const booking = await BookingModel.create({
            clientName: 'Laura Gómez',
            clientEmail: 'laura@example.com',
            date: '2026-11-15',
            time: '10:30',
            status: 'confirmed',
            services: [
                { service: inserted[0]._id, quantity: 1 },
                { service: inserted[5]._id, quantity: 2 }
            ]
        });
        console.log(`✅ Reserva de ejemplo creada: ${booking._id}`);
    }
}

await mongoose.disconnect();
