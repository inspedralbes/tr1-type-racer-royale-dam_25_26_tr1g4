const db = require('../config/database');

class Sessio {
  static async create(newSessio) {
    const [result] = await db.execute(
      'INSERT INTO sessions (room_code, status, num_participants, duration) VALUES (?, ?, ?, ?)',
      [newSessio.room_code, newSessio.status, newSessio.num_participants, newSessio.duration]
    );
    return result.insertId;
  }

  static async findByRoomCode(roomCode) {
    const [rows] = await db.execute('SELECT * FROM sessions WHERE room_code = ?', [roomCode]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM sessions WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateStatus(id, status) {
    await db.execute('UPDATE sessions SET status = ? WHERE id = ?', [status, id]);
  }
}

module.exports = Sessio;
