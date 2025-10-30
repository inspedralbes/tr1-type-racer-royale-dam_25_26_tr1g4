const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: String,
  salaId: String,
  startedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);
