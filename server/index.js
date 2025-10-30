
const express = require('express');
const cors = require('cors');

const sequelize = require('./config/database');

const User = require('./models/user');
const Sessio = require('./models/sessio');
const Performance = require('./models/performance');

const userRoutes = require('./routes/userRoutes');

const app = express();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOptions));

app.use(express.json());

User.hasMany(Sessio, { foreignKey: 'host_user_id', as: 'hostedSessions' });
Sessio.belongsTo(User, { foreignKey: 'host_user_id', as: 'host' });

User.hasMany(Performance, { foreignKey: 'user_id' });
Performance.belongsTo(User, { foreignKey: 'user_id' });

Sessio.hasMany(Performance, { foreignKey: 'sessio_id' });
Performance.belongsTo(Sessio, { foreignKey: 'sessio_id' });

async function startServer() { 
  try {
    await sequelize.authenticate();
    console.log('✅ Connectat a MySQL (amb Sequelize)');

    await sequelize.sync({ alter: true });
    console.log('🔄 Models sincronitzats amb la BBDD');

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
