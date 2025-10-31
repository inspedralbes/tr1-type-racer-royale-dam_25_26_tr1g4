// ws/gameSocket.js
const { WebSocketServer } = require('ws');

const sessions = {};

function initGameSocket(server) {
  const wss = new WebSocketServer({ server });
  console.log(' WebSocket server actiu');

  wss.on('connection', (ws) => {
    console.log(' Nou client connectat');

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        handleMessage(ws, data);
      } catch (err) {
        console.error('Missatge invàlid:', err);
      }
    });

    ws.on('close', () => {
      console.log('client desconnectat');
      removeFromSessions(ws);
    });
  });
}


function handleMessage(ws, data) {
  const { action, payload } = data;

  switch (action) {

    case 'login':
      LoggedIn(ws, playload.UserID)
    case 'join_room':
      joinRoom(ws, payload);
      break;
    case 'leave_room':
      leaveRoom(ws, payload);
      break;
    case 'send_message':
      broadcast(payload.sessionId, {
        from: payload.username,
        message: payload.message,
      });
      
      case 'send_message':
      broadcast(payload.sessionId, {
        from: payload.username,
        message: payload.message,
      });
      
      break;
    default:
      ws.send(JSON.stringify({ error: 'Acció desconeguda' }));
  }
}

function joinRoom(ws, { sessionId, username }) {
  if (!sessions[sessionId]) sessions[sessionId] = [];
  sessions[sessionId].push(ws);
  ws.sessionId = sessionId;
  ws.username = username;

  console.log(`${username} s’ha unit a la sala ${sessionId}`);
  broadcast(sessionId, { system: true, message: `${username} s’ha unit a la sala.` });
}

function leaveRoom(ws, { sessionId }) {
  if (!sessions[sessionId]) return;
  sessions[sessionId] = sessions[sessionId].filter(client => client !== ws);
  broadcast(sessionId, { system: true, message: `${ws.username} ha sortit de la sala.` });
}

function removeFromSessions(ws) {
  const sessionId = ws.sessionId;
  if (sessionId && sessions[sessionId]) {
    sessions[sessionId] = sessions[sessionId].filter(client => client !== ws);
  }
}

function broadcast(sessionId, message) {
  if (!sessions[sessionId]) return;
  sessions[sessionId].forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}



module.exports = { initGameSocket };
