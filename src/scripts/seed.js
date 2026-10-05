// Carga servicios iniciales en MongoDB (reemplaza al viejo src/data/services.json)
// Uso: npm run seed
import mongoose from 'mongoose';
import { connectDB } from '../config/database.config.js';
import { ServiceModel } from '../dao/models/service.model.js';

const services = [
    {
        name: 'Corte de Pelo',
        description: 'Corte masculino tradicional',
        duration: 30,
        price: 1500,
        category: 'Peluquería',
        available: true
    },
    {
        name: 'Consulta Médica',
        description: 'Evaluación médica general y diagnóstico',
        duration: 45,
        price: 5000,
        category: 'Salud',
        available: true
    }
];

await connectDB();

const existing = await ServiceModel.countDocuments();
if (existing > 0) {
    console.log(`ℹ️ La colección services ya tiene ${existing} documentos. No se insertó nada.`);
} else {
    const inserted = await ServiceModel.insertMany(services);
    console.log(`✅ ${inserted.length} servicios insertados:`);
    inserted.forEach(s => console.log(`   ${s._id}  ${s.name}`));
}

await mongoose.disconnect();
