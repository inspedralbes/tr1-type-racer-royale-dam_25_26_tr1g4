
const express = require('express');
const cors = require('cors');

const createTables = require('./config/tables');
const userRoutes = require('./routes/userRoutes');

const app = express();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOptions));

app.use(express.json());

async function startServer() { 
  try {
    await createTables();
    const PORT =  7001;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor Express escoltant al port http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      console.error('❌ Error de servidor:', err);
      process.exit(1);
    });

  } catch (err) {
    console.error('❌ Error de connexió a MySQL:', err);
    process.exit(1);
  }
}

app.use('/api/users', userRoutes);

startServer();
