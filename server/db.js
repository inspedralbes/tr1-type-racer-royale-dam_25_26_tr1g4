// db.js DE PROBA, SUSTITUIR PER FINAL !!!!!!!!!
const mysql = require('mysql2/promise');

// Crea una connexió amb la teva base de dades MySQL2
const pool = mysql.createPool({
  host: 'localhost',          // o el teu host (p. ex. AWS RDS)
  user: 'root',               // usuari MySQL
  password: '1234',           // contrasenya MySQL
  database: 'fitness_app',    // nom de la base de dades
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;



/* --> PROBAR CODI (?)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

module.exports = pool;
*/