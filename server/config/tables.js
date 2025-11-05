const db = require('./database');

async function createTables() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      wins INT NOT NULL DEFAULT 0,
      looses INT NOT NULL DEFAULT 0,
      score BIGINT NOT NULL DEFAULT 0,
      best_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00
    );
  `;

  const sessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_code VARCHAR(8) NOT NULL UNIQUE,
      status ENUM('waiting', 'in-progress', 'finished') NOT NULL DEFAULT 'waiting',
      num_participants INT NOT NULL DEFAULT 8,
      duration INT NOT NULL DEFAULT 60,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const performancesTable = `
    CREATE TABLE IF NOT EXISTS performances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      sessio_id INT NOT NULL,
      reps INT NOT NULL DEFAULT 0,
      score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      won BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (sessio_id) REFERENCES sessions(id),
      UNIQUE KEY (user_id, sessio_id)
    );
  `;

  //Taula per el leaderboard global
const resultatsGlobals =
`CREATE TABLE IF NOT EXISTS ResultatsGlobals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    repeticions_totals INT NOT NULL,
    data_record DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);`

  try {
    await db.execute(usersTable);
    await db.execute(sessionsTable);
    await db.execute(performancesTable);
    await db.execute(resultatsGlobals);
    console.log('🔄 Tables created or already exist.');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  }
}

module.exports = createTables;