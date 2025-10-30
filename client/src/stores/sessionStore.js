import { defineStore } from 'pinia';
import { WSClient } from '../services/wsClient';


export const useSessionStore = defineStore('session', {
  state: () => ({
    ws: null,
    connected: false,
    leaderboard: {},
    roomId: null,
    username: null,
  }),
  actions: {
    initWebsocket(url) {
      this.ws = new WSClient(url);
      this.ws.onOpen = () => { this.connected = true; };
      this.ws.onMessage = (msg) => {
        if (msg.type === 'leaderboard_update' || msg.type === 'user_joined' || msg.type === 'user_left') {
          this.leaderboard = msg.leaderboard;
        } else if (msg.type === 'session_ended') {
          this.leaderboard = msg.leaderboard;
          // maybe navigate to results view
        }
      };
      this.ws.connect();
    },
    joinRoom(roomId, username) {
      this.roomId = roomId; this.username = username;
      this.ws.send({ type: 'join_room', roomId, username });
    },
    updateReps(reps) {
      this.ws.send({ type: 'update_reps', roomId: this.roomId, username: this.username, reps });
    },
    endSession() {
      this.ws.send({ type: 'end_session', roomId: this.roomId });
    }
  }
});





