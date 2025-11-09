const db = require("../config/database");

class Routine {
  static async create(newRoutine) {
    const { name, description, creator_id, duration_minutes, difficulty } =
      newRoutine;
    const [result] = await db.execute(
      "INSERT INTO routines (name, description, creator_id, duration_minutes, difficulty) VALUES (?, ?, ?, ?, ?)",
      [name, description, creator_id, duration_minutes, difficulty]
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

  static async findByCreatorId(creatorId) {
    const [rows] = await db.execute(
      "SELECT * FROM routines WHERE creator_id = ?",
      [creatorId]
    );
    return rows;
  }
}

module.exports = Routine;
