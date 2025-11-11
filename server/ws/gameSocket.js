
const { WebSocketServer } = require('ws');
const url = require('url');
const User = require('../models/user');
const db = require('../config/database');

const sessions = {};

/**
 * 1. 💾 Guarda un resultat a la Base de Dades (INSERT MySQL2).
 */
async function saveResultToDatabase(userId, username, reps) {
    const sql = `
        INSERT INTO resultats_globals 
        (user_id, username, repeticions_totals) 
        VALUES (?, ?, ?)
    `;
    
    try {
        await db.execute(sql, [userId, username, reps]);
        console.log(`[BD] Resultat de ${username} (${reps} reps) guardat.`);
    } catch (err) {
        console.error('❌ Error guardant el resultat a MySQL:', err);
    }
}

/**
 * 2. 🔍 Comprova si les repeticions actuals superen el rècord històric de l'usuari.
 */
async function checkGlobalRecord(ws, userId, username, currentReps) {
    // Consulta: Obtenir la millor puntuació MAI aconseguida per aquest usuari
    const sql_check = `
        SELECT 
            MAX(repeticions_totals) AS best_reps 
        FROM 
            resultats_globals 
        WHERE 
            user_id = ?;
    `;
    
    try {
        const [rows] = await db.execute(sql_check, [userId]);
        const best_historic_reps = rows[0]?.best_reps || 0;

        if (currentReps > best_historic_reps) {
            
            // 🚨 S'ha batut un rècord! 
            // Guardem el nou rècord immediatament
            await saveResultToDatabase(userId, username, currentReps);
            
            // Enviem un missatge d'èxit només a l'usuari que ha batut el rècord
            ws.send(JSON.stringify({
                type: 'new_global_record',
                payload: {
                    reps: currentReps,
                    message: "🎉 ¡Nou rècord personal GLOBAL durant la partida!"
                }
            }));
            
            console.log(`[RÈCORD BATUT] ${username}: ${currentReps} reps.`);
        }
    } catch (err) {
        console.error('Error comprovant rècord global:', err);
    }
}

module.exports = { 
    checkGlobalRecord,
    saveResultToDatabase // Opcional, però útil si es vol guardar el resultat final
};


// 🚨 FI DE LES NOVES FUNCIONS D'INTEGRACIÓ DE BD


function initGameSocket(server) {
  const wss = new WebSocketServer({ server });
  console.log(' WebSocket server actiu');

  wss.on('connection', async (ws, req) => {
    console.log(' Nou client connectat');
    const { query } = url.parse(req.url, true);
    const username = query.username;

    if (!username) {
      console.log('Connexió sense nom d\'usuari. Tancant.');
      ws.close();
      return;
    }

    try {
      const user = await User.findByUsername(username);
      if (user) {
        ws.userId = user.id;
        ws.username = user.username;
        console.log(`Client connectat com a ${username} (ID: ${user.id})`);
      } else {
        console.log(`Usuari ${username} no trobat a la BD. Tancant connexió.`);
        ws.close();
        return;
      }
    } catch (error) {
      console.error('Error al buscar usuari:', error);
      ws.close();
      return;
    }

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
    case 'create_room':
      createRoom(ws, false);
      break;
    case 'create_public_room':
      createRoom(ws, true);
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

      // 🚨 NOU CASE: Fi de la competició
        case 'end_competition':
            if (ws.sessionId) {
                processCompetitionEnd(ws.sessionId);
            }
            break;
    default:
      ws.send(JSON.stringify({ error: 'Acció desconeguda' }));
  }
}

async function createRoom(ws, isPublic) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  try {
    const sql = `
      INSERT INTO routines (room_code, is_public) 
      VALUES (?, ?)
    `;
    await db.execute(sql, [roomId, isPublic]);
    console.log(`[DB] Room ${roomId} created in routines table.`);
    
    // Automatically join the user to the created room
    joinRoom(ws, { roomId: roomId });

  } catch (err) {
    console.error('Error creating room in DB:', err);
    ws.send(JSON.stringify({ error: 'Error creating room' }));
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
  
    // 🚨 NOVA LÒGICA: Comprovar i guardar el rècord global
    // Cal passar el socket (ws) per enviar el missatge individual
    const ws = session.participants[userId].ws; // Obtenim la referència al socket guardada a joinRoom
    const username = session.participants[userId].username;

    // 🚨 CRIDA CLAU
    checkGlobalRecord(ws, userId, username, newRepCount);
    console.log(`${username} té ara ${newRepCount} repeticions.`);
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

/**
 * 4. 🏆 Procesa la fi de la competició, declara el guanyador.
 * Només fa broadcast del guanyador i usa saveResultToDatabase (que ja comprueba si es record)
 * @param {string} sessionId - ID de la sala.
 */
async function processCompetitionEnd(sessionId) {
    const session = sessions[sessionId];
    if (!session) return;

    const participantArray = Object.values(session.participants);
    
    if (participantArray.length === 0) return;

    // Determinar el guanyador
    participantArray.sort((a, b) => b.reps - a.reps);
    const winner = participantArray[0];
    
    // 🚨 JA HEM GUARDAT ELS RÈCORDS INDIVIDUALS A updateReps, però enviem la victòria final

    const victoryMessage = {
        type: 'competition_ended', // Acció que el client ha d'escoltar
        payload: {
            winnerUsername: winner.username,
            winnerReps: winner.reps,
            finalLeaderboard: participantArray.map(p => ({
                username: p.username,
                reps: p.reps,
            })),
        },
    };

    broadcastMessage(sessionId, victoryMessage);
    console.log(`🎉 COMPETICIÓ ACABADA a la sala ${sessionId}. Guanyador: ${winner.username}`);
}


function joinRoom(ws, { roomId }) {
  const sessionId = roomId;

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      clients: [], 
      participants: {} 
    };
  }

  // TODO: Check if room is full before joining

  sessions[sessionId].clients.push(ws);
  
  sessions[sessionId].participants[ws.userId] = {
    username: ws.username,
    reps: 0, 
    ws: ws 
  };

  ws.sessionId = sessionId;

  console.log(`${ws.username} s’ha unit a la sala ${sessionId}`);
  
  broadcastMessage(sessionId, { action: 'new_message', payload: { username: 'System', text: `${ws.username} has joined the room.` } });
  
  broadcastLeaderboard(sessionId); 

  ws.send(JSON.stringify({
    action: 'join_success',
    payload: {
      roomId: sessionId,
      players: Object.values(sessions[sessionId].participants).map(p => ({username: p.username, reps: p.reps})),
    }
  }));
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


