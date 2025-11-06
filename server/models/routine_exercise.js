const db = require("../config/database");

class RoutineExercise {
  static async create(routineId, exerciseId) {
    await db.execute(
      "INSERT INTO routine_exercises (routine_id, exercise_id) VALUES (?, ?)",
      [routineId, exerciseId]
    );
  }

  static async findExercisesByRoutineId(routineId) {
    const [rows] = await db.execute(
      "SELECT e.* FROM exercises e JOIN routine_exercises re ON e.id = re.exercise_id WHERE re.routine_id = ?",
      [routineId]
    );
    return rows;
  }
}

module.exports = RoutineExercise;
