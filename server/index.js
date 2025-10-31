const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db'); 
const userRoutes = require('./routes/userRoutes');
const { initGameSocket } = require('./ws/gameSocket'); 

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/users', userRoutes);

(async () => {
  try {
    const con = await pool.getConnection();
    console.log('Connectat correctament a MySQL');
    con.release();
  } catch (err) {
    console.error(' Error connectant a la base de dades:', err.message);
  }
})();

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Servidor escoltant a http://localhost:${PORT}`);
});

initGameSocket(server);
