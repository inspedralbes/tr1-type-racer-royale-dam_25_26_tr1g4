require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { createWebSocketServer } = require('./websocket');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fithub';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

const Session = require('./models/Session');
app.get('/api/sessions', async (req, res) => {
  const sessions = await Session.find().sort({ startedAt: -1 }).limit(50);
  res.json(sessions);
});

const server = http.createServer(app);
createWebSocketServer(server);

server.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
