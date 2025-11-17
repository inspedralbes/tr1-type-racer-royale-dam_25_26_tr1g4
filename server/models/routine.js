const db = require("../config/database");

class Routine {
  static async create(newRoutine) {
    const { name, description, exercise_id } =
      newRoutine;
    const [result] = await db.execute(
      "INSERT INTO routines (name, description, exercise_id) VALUES (?, ?, ?)",
      [name, description, exercise_id]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute("SELECT * FROM routines WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute("SELECT * FROM routines");
    return rows;
  }

  static async findByExerciseId(exerciseId) {
    const [rows] = await db.execute(
      "SELECT * FROM routines WHERE exercise_id = ?",
      [exerciseId]
    );
    return rows;
  }
}

module.exports = Routine;
