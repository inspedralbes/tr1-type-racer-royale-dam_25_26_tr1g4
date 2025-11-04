
const { WebSocketServer } = require('ws');
const Sessio = require('../models/sessio');

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
      LoggedIn(ws, payload.UserID);
      break;
    case 'join_room':
      joinRoom(ws, payload);
      break;
    case 'leave_room':
      leaveRoom(ws, payload);
      break;
    case 'send_message':
      broadcastMessage(payload.sessionId, {
        from: payload.username,
        message: payload.message,
      });
      break;

       case 'update_reps':
         if (ws.sessionId && ws.userId && payload && typeof payload.reps === 'number') {
        updateReps(ws.sessionId, ws.userId, payload.reps);
      } else {
        console.error('Dades invàlides per a update_reps:', payload);
      }
      break;
    default:
      ws.send(JSON.stringify({ error: 'Acció desconeguda' }));
  }
}
/**
 * Actualitza les repeticions d'un usuari i fa broadcast del nou Leaderboard.
 * @param {string} sessionId - ID de la sala.
 * @param {string} userId - ID de l'usuari que ha fet la repetició.
 * @param {number} newRepCount - El nou total de repeticions de l'usuari.
 */

      function updateReps(sessionId, userId, newRepCount) {
  const session = sessions[sessionId];
if (!session || !session.participants[userId]) {
    console.warn(`Sessió ${sessionId} o usuari ${userId} no trobat.`);
    return;
  }
  // 1. Actualitzar l'estat local (in-memory)
  session.participants[userId].reps = newRepCount;
  console.log(`${session.participants[userId].username} té ara ${newRepCount} repeticions.`);
  // 2. Enviar l'actualització de la classificació a tots els clients de la sala
  broadcastLeaderboard(sessionId);
}
/**
 * Genera el leaderboard, l'ordena i l'envia a tots els clients de la sessió.
 * @param {string} sessionId - ID de la sala.
 */

function broadcastLeaderboard(sessionId) {
  const session = sessions[sessionId];
  if (!session) return;
  // 1. Convertir l'objecte d'usuaris a un array de dades ({username, reps, ...})
  const leaderboardArray = Object.values(session.participants);
  // 2. Ordenar per repeticions de forma descendent (de més a menys)
  leaderboardArray.sort((a, b) => b.reps - a.reps);
  // 3. Crear el missatge estandarditzat
  const leaderboardMessage = {
    // És crucial que el client sàpiga quin tipus de missatge rep
    type: 'leaderboard_update',
    data: leaderboardArray, // Array ja ordenat
  };

   // 4. Utilitzar la funció existent per enviar a tots els clients de la sala
  broadcastMessage(sessionId, leaderboardMessage);
 
  console.log(`Leaderboard de la sessió ${sessionId} actualitzat i enviat.`);
}

async function LoggedIn(ws, userId) {
  try {
    const newSessio = await Sessio.create({
      user_id: userId,
    });
    ws.sessionId = newSessio.id;
    console.log(`User ${userId} logged in and session ${ws.sessionId} created`);
  } catch (err) {
    console.error('Error creating session:', err);
  }
}

function login(ws, userId) {
  ws.userId = userId;
  console.log(`User ${userId} logged in`);
}

function joinRoom(ws, { sessionId, username }) {
  if (!sessions[sessionId]) {
    // 🚨 NOVA ESTRUCTURA DE LA SALA: Conté l'array de clients i l'objecte de participants (leaderboard)
    sessions[sessionId] = {
      clients: [], 
      participants: {} 
    };
  }

  // 1. Afegir el client al nou array de clients (per broadcast)
  sessions[sessionId].clients.push(ws);
  
  // 2. Afegir l'usuari a la llista de participants amb 0 repeticions
  sessions[sessionId].participants[userId] = {
    username: username,
    reps: 0, 
    ws: ws 
  };

  // Associar dades clau al socket (crucial pel funcionament d''update_reps')
  ws.sessionId = sessionId;
  ws.userId = userId;
  ws.username = username;

  console.log(`${username} s’ha unit a la sala ${sessionId}`);
  
  // Notificació de sistema (utilitza la funció adaptada)
  broadcastMessage(sessionId, { system: true, message: `${username} s’ha unit a la sala.` });
  
  // 3. Enviar el leaderboard inicial
  broadcastLeaderboard(sessionId); 
}

function leaveRoom(ws, { sessionId }) {
  // L'usuari haurà de tenir ws.userId assignat per funcionar
  if (!sessions[sessionId]) return;
  
  // Cridar a removeFromSessions per fer la neteja i el broadcast
  removeFromSessions(ws);
  
  // Opcional: enviar missatge de sistema, ja que removeFromSessions ja ho fa implícitament
  // broadcastMessage(sessionId, { system: true, message: `${ws.username} ha sortit de la sala.` });
}

function removeFromSessions(ws) {
  const sessionId = ws.sessionId;
  const userId = ws.userId; 

  if (sessionId && sessions[sessionId]) {
    // 1. Eliminar del llistat de clients
    sessions[sessionId].clients = sessions[sessionId].clients.filter(client => client !== ws);
    
    // 2. Eliminar del Leaderboard
    if (sessions[sessionId].participants[userId]) {
        broadcastMessage(sessionId, { system: true, message: `${sessions[sessionId].participants[userId].username} ha sortit de la sala.` });
        delete sessions[sessionId].participants[userId];
    }
    
    // 3. Actualitzar la classificació immediatament
    broadcastLeaderboard(sessionId);
    
    // Neteja final: Si la sala queda buida, l'eliminem
    if (sessions[sessionId].clients.length === 0) {
        delete sessions[sessionId];
        console.log(`Sala ${sessionId} eliminada per estar buida.`);
    }
  }
}

function broadcastMessage(sessionId, message) {
  const session = sessions[sessionId];
  if (!session || !session.clients) return;
 
  session.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
module.exports = { initGameSocket };


