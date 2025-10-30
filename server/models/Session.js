const mongoose = require('mongoose');


const sessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  leaderboard: { type: Object, default: {} },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});


module.exports = mongoose.model('Session', sessionSchema);





