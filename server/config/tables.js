const db = require("./database");
const fs =require('fs');
const path = require('path');
const { sequelize, User } = require('../models/sequelize'); // Import sequelize and User model

const test_data_sql_path = path.join(__dirname, 'test_data.sql');
const insert_Test_Data = fs.readFileSync(test_data_sql_path, 'utf8');

async function createTables() {

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
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
    // Drop tables in reverse order of creation to respect foreign keys
    await db.execute('DROP TABLE IF EXISTS performances;');
    await db.execute('DROP TABLE IF EXISTS routine_exercises;');
    await db.execute('DROP TABLE IF EXISTS resultats_globals;');
    await db.execute('DROP TABLE IF EXISTS routines;');
    await db.execute('DROP TABLE IF EXISTS exercises;');

    // Sync Sequelize model (drops and recreates users table)
    await User.sync({ force: true });
    console.log("✅ Sequelize User model synced successfully.");

    await db.execute(exercisesTable); // Primero las tablas sin dependencias
    await db.execute(routinesTable);
    await db.execute(routineExercisesTable); // Luego las que dependen de otras
    await db.execute(performancesTable); // Luego las que dependen de otras
    await db.execute(resultatsGlobals); // Esta no tiene dependencias de FK, el orden es flexible
    console.log("✅ Non-Sequelize tables created or already exist.");

    // Check if there is data in users table to prevent re-inserting
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("🌱 No users found. Seeding database with test data...");
      const usersToInsert = [
        { username: 'jugador1', password: '$2b$10$abcdefghijklmnopqrstuv', email: 'jugador1@test.com', wins: 5, looses: 2, score: 1000, best_score: 85.50 },
        { username: 'jugador2', password: '$2b$10$abcdefghijklmnopqrstuv', email: 'jugador2@test.com', wins: 3, looses: 4, score: 750, best_score: 78.25 },
        { username: 'jugador3', password: '$2b$10$abcdefghijklmnopqrstuv', email: 'jugador3@test.com', wins: 7, looses: 1, score: 1500, best_score: 92.75 },
        { username: 'jugador4', password: '$2b$10$abcdefghijklmnopqrstuv', email: 'jugador4@test.com', wins: 2, looses: 5, score: 500, best_score: 65.00 }
      ];
      await User.bulkCreate(usersToInsert);
      
      // Keep inserting other test data via SQL
      const statements = insert_Test_Data.split(';').filter(s => s.trim() !== '');
      for (const statement of statements) {
        await db.query(statement);
      }
      
      console.log("✅ Test data inserted successfully.");
    } else {
      console.log("ℹ️ Database already contains data. Skipping seeding.");
    }
  } catch (err) {
    console.error("❌ Error creating tables:", err);
    process.exit(1);
  }
}

module.exports = createTables;
