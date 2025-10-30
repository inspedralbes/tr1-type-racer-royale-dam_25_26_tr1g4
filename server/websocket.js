const WebSocket = require('ws');
const Session = require('./models/Session');


const rooms = {}; // { roomId: { clients: Set, leaderboard: {} } }


function broadcast(roomId, message) {
  const room = rooms[roomId];
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const ws of room.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}


function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });


  wss.on('connection', ws => {
    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }


      const { type } = msg;
      if (type === 'join_room') {
        const { roomId, username } = msg;
        if (!rooms[roomId]) {
          rooms[roomId] = { clients: new Set(), leaderboard: {} };
          // create DB session doc
          await Session.create({ roomId, leaderboard: {} });
        }
        rooms[roomId].clients.add(ws);
        ws.roomId = roomId; ws.username = username;
        rooms[roomId].leaderboard[username] = 0;
        broadcast(roomId, { type: 'user_joined', username, leaderboard: rooms[roomId].leaderboard });
      }


      else if (type === 'update_reps') {
        const { roomId, username, reps } = msg;
        if (!rooms[roomId]) return;
        rooms[roomId].leaderboard[username] = reps;
        broadcast(roomId, { type: 'leaderboard_update', leaderboard: rooms[roomId].leaderboard });
      }


      else if (type === 'end_session') {
        const { roomId } = msg;
        if (!rooms[roomId]) return;
        const sessionDoc = await Session.findOne({ roomId }).exec();
        if (sessionDoc) {
          sessionDoc.leaderboard = rooms[roomId].leaderboard;
          sessionDoc.endedAt = new Date();
          await sessionDoc.save();
        }
        broadcast(roomId, { type: 'session_ended', leaderboard: rooms[roomId].leaderboard });
        // cleanup
        for (const c of rooms[roomId].clients) {
          try { c.close(); } catch {}
        }
        delete rooms[roomId];
      }
    });


    ws.on('close', () => {
      const { roomId, username } = ws;
      if (roomId && rooms[roomId]) {
        rooms[roomId].clients.delete(ws);
        delete rooms[roomId].leaderboard[username];
        broadcast(roomId, { type: 'user_left', username, leaderboard: rooms[roomId].leaderboard });
        if (rooms[roomId].clients.size === 0) delete rooms[roomId];
      }
    });
  });


  console.log('✅ WebSocket server started');
}


module.exports = { createWebSocketServer };





