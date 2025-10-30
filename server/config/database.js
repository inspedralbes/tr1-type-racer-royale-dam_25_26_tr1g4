const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('projBD', 'root', '1234', {
  host: '127.0.0.1',  
  dialect: 'mysql',
  dialectOptions: {
    connectTimeout: 20000 // 20 seconds
  },
  pool: {
      max: 5,    
      min: 0,    
      acquire: 30000, 
      idle: 10000,    
      testOnBorrow: true
    }
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connection has been established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });

module.exports = sequelize;

