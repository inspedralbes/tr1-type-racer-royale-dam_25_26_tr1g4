
import { defineStore } from 'pinia';

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    socket: null,
    isConnected: false,
    roomState: null, // Will hold { roomId, players, maxPlayers }
    publicRooms: [],
    error: null,
    gameStarting: false,
    username: localStorage.getItem('username') || null,
    chatMessages: [], // New state for chat messages
    selectedExerciseId: null,
    lastMessage: null,
  }),
  actions: {
    connect(url) {
      // Extract username from URL for storing it
      const urlParams = new URLSearchParams(url.split('?')[1]);
      this.username = urlParams.get('username');
      localStorage.setItem('username', this.username);

      if (this.socket && this.isConnected) {
        return;
      }
      
      if (this.socket) {
        this.socket.close();
      }

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('WebSocket connected');
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.socket = null;
        this.roomState = null;
        console.log('WebSocket disconnected');
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.error = 'WebSocket connection error.';
        this.isConnected = false;
        this.socket = null;
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Server message:', data);
        this.lastMessage = data;
        this.handleMessage(data);
      };
    },

    handleMessage(data) {
      this.error = null; // Reset error on new message
      switch (data.action) {
        case 'room_created':
        case 'join_success':
          this.roomState = data.payload;
          break;
        case 'player_joined':
        case 'player_left':
        case 'players_ready_update':
          if (this.roomState && this.roomState.roomId === data.payload.roomId) {
            this.roomState = { ...this.roomState, ...data.payload };
          }
          break;
        case 'leaderboard_update':
            if (this.roomState) {
                this.roomState.players = data.payload.leaderboard;
            }
            break;
        case 'public_rooms_list':
          this.publicRooms = data.payload;
          break;
        case 'game_starting':
          this.handleGameStarting(data.payload);
          break;
        case 'room_full':
          console.log(`Room ${data.payload.roomId} is full.`);
          break;
        case 'chat_message':
        case 'new_message':
          this.chatMessages.push(data.payload);
          break;
        case 'error':
          this.error = data.payload.message;
          break;
      }
    },

    handleGameStarting(payload) {
      this.gameStarting = true;
      if (payload && payload.exerciseId) {
        this.selectedExerciseId = payload.exerciseId;
      }
    },

    disconnect() {
      if (this.socket) {
        this.socket.close();
      }
      localStorage.removeItem('username');
      this.username = null;
    },

    sendMessage(message) {
      console.log('sendMessage called in websocket store with message:', message);
      if (this.socket && this.isConnected) {
        this.socket.send(JSON.stringify(message));
      } else {
        console.error('WebSocket is not connected.');
        this.error = 'WebSocket is not connected.';
      }
    },
    
    leaveRoom() {
      if (this.roomState) {
        this.sendMessage({
          action: 'leave_room',
          payload: { roomId: this.roomState.roomId },
        });
        this.resetRoomState();
      }
    },

    resetRoomState() {
        this.roomState = null;
        this.gameStarting = false;
        this.chatMessages = [];
        this.selectedExerciseId = null;
    }
  },
});
