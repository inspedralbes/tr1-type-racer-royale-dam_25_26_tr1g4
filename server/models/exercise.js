const db = require("../config/database");

class Exercise {
  static async create(newExercise) {
    const [result] = await db.execute(
      "INSERT INTO exercises (name, description, difficulty) VALUES (?, ?, ?)",
      [newExercise.name, newExercise.description, newExercise.difficulty]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute("SELECT * FROM exercises WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute("SELECT * FROM exercises");
    return rows;
  }

  static async findByDifficulty(difficulty) {
    const [rows] = await db.execute(
      "SELECT * FROM exercises WHERE difficulty = ?",
      [difficulty]
    );
    return rows;
  }
}
