const db = require('../config/database');

class Performance {
  static async create(newPerformance) {
    const [result] = await db.execute(
      'INSERT INTO performances (user_id, sessio_id, reps, score, won) VALUES (?, ?, ?, ?, ?)',
      [newPerformance.user_id, newPerformance.sessio_id, newPerformance.reps, newPerformance.score, newPerformance.won]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute('SELECT * FROM performances WHERE user_id = ?', [userId]);
    return rows;
  }

  static async findBySessioId(sessioId) {
    const [rows] = await db.execute('SELECT * FROM performances WHERE sessio_id = ?', [sessioId]);
    return rows;
  }
}

module.exports = Performance;
