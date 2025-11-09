const db = require("./database");

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

  const routinesTable = `
    CREATE TABLE IF NOT EXISTS routines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_code VARCHAR(8) NOT NULL UNIQUE,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      exercise_text TEXT,
      status ENUM('waiting', 'in-progress', 'finished') NOT NULL DEFAULT 'waiting',
      num_participants INT NOT NULL DEFAULT 8,
      duration INT NOT NULL DEFAULT 60,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const exercisesTable = `
    CREATE TABLE IF NOT EXISTS exercises (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'easy',
      tren ENUM('superior', 'inferior') NOT NULL DEFAULT 'superior',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const routineExercisesTable = `
    CREATE TABLE IF NOT EXISTS routine_exercises (
      routine_id INT NOT NULL,
      exercise_id INT NOT NULL,
      set_duration_seconds INT NOT NULL COMMENT 'Duración de la serie en segundos',
      rest_duration_seconds INT NOT NULL COMMENT 'Duración del descanso post-ejercicio en segundos',
      PRIMARY KEY (routine_id, exercise_id),
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `;

  const performancesTable = `
    CREATE TABLE IF NOT EXISTS performances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      routine_id INT NOT NULL,
      exercise_id INT NOT NULL,
      reps INT NOT NULL DEFAULT 0,
      score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      won BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id),
      UNIQUE KEY uk_user_routine_exercise (user_id, routine_id, exercise_id)
    );
  `;

  //Taula per el leaderboard global
  const resultatsGlobals = `CREATE TABLE IF NOT EXISTS resultats_globals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    repeticions_totals INT NOT NULL,
    data_record DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`;

  try {
    await db.execute(usersTable);
    await db.execute(exercisesTable); // Primero las tablas sin dependencias
    await db.execute(routinesTable);
    await db.execute(routineExercisesTable); // Luego las que dependen de otras
    await db.execute(performancesTable); // Luego las que dependen de otras
    await db.execute(resultatsGlobals); // Esta no tiene dependencias de FK, el orden es flexible
    console.log("🔄 Tables created or already exist.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
    process.exit(1);
  }
}

module.exports = createTables;
