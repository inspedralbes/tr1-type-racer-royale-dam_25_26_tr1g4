// index.js (o server.js)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const userRoutes = require('./routes/userRoutes'); 

const app = express();

const corsOptions = {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Afegim 'Accept' per a més compatibilitat
};

app.use(cors(corsOptions));

// === 2. Middlewares de Dades (Després de CORS) ===
// Permet a Express parsejar peticions amb format application/json
app.use(express.json()); 


// === 3. Connexió a MongoDB ===
// AVÍS: En una aplicació real, aquestes dades haurien d'estar en un fitxer .env
const DB_URI = 'mongodb+srv://admin:1234@login.fcehoew.mongodb.net/?appName=login';
const JWT_SECRET = 'dggsgsgsgsg'; 

mongoose.connect(DB_URI)
  .then(() => console.log('✅ Connectat a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de connexió a MongoDB:', err));


// === 4. Rutes d'API (ÚLTIMES) ===
// Totes les rutes de l'usuari estaran disponibles a /api/users
app.use('/api/users', userRoutes); 


// === 5. Inici del Servidor ===
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express escoltant al port http://localhost:${PORT}`);
});
