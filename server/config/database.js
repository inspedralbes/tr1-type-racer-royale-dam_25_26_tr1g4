const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: "root",
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Unable to connect to the database:", err);
    return;
  }
  console.log("✅ Connection has been established successfully.");
  connection.release();
});

module.exports = pool.promise();
