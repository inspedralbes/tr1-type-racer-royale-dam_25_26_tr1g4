const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'db_mysql',
  user: 'root',
  password: '1234',
  database: 'projBD',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Unable to connect to the database:', err);
    return;
  }
  console.log('✅ Connection has been established successfully.');
  connection.release();
});

module.exports = pool.promise();

