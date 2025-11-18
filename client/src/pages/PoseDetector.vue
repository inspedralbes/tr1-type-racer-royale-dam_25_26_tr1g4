<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import Chat from "@/components/Chat.vue";
import { useWebSocketStore } from "@/stores/websocket";
import { PoseDetectionService } from "@/services/PoseDetectionService";
import { exerciseAnalyzers } from "@/logic/exerciseAnalyzers";

// WebSocket Store
const wsStore = useWebSocketStore();

// Component Props
const props = defineProps({
  sessionId: String,
  userId: String,
  username: String,
  exercise: String,
});

// Game state
const isCameraReady = ref(false);
const areAllPlayersReady = ref(false);
const preparationTime = ref(10);
const gameTime = ref(60);
const isGameRunning = ref(false);
const isGameFinished = ref(false);

// --- CAMBIO 1: Leaderboard como ref local para actualización inmediata ---
const leaderboard = ref([]);
const finalLeaderboard = ref([]);

// Chat messages
const chatMessages = computed(() => wsStore.chatMessages);

// Chat toggle state
const chatOpen = ref(false);
const toggleChat = () => {
  chatOpen.value = !chatOpen.value;
};

// Refs related
const videoRef = ref(null);
const canvasRef = ref(null);
const repCounter = ref(0);
const exerciseState = ref("up");
const feedbackMsg = ref("¡Prepárate!");

let poseDetectionService = null;

// --- WebSocket Functions ---
function sendRepetitionUpdate(count) {
  // Esta función está perfecta, envía el dato al servidor
  const message = {
    action: "update_reps",
    payload: {
      userId: props.userId,
      roomId: props.sessionId, // <-- AÑADIDO: Esencial para que el servidor sepa qué sala actualizar
      reps: count,
    },
  };
  wsStore.sendMessage(message);
}

const handleSendMessage = (message) => {
  wsStore.sendMessage({
    action: "send_message",
    payload: { roomId: props.sessionId, text: message },
  });
};

// --- Exercise Logic Callbacks ---
const handleRepetition = () => {
  if (!isGameRunning.value) return;

  // 1. Incrementamos localmente
  repCounter.value++;

  // 2. Enviamos al servidor para que actualice el leaderboard global
  sendRepetitionUpdate(repCounter.value);
};

const handleFeedback = (message) => {
  feedbackMsg.value = message;
};

// --- Pose Estimation Handler ---
const handlePoseEstimate = (keypoints) => {
  if (keypoints) {
    const analyzer = exerciseAnalyzers[props.exercise];
    if (analyzer) {
      analyzer(keypoints, exerciseState, handleRepetition, handleFeedback);
    } else {
      feedbackMsg.value = `Ejercicio '${props.exercise}' no reconocido.`;
    }
  } else {
    feedbackMsg.value = "Buscando persona...";
  }
};

// --- Timer Functions ---
function startPreparationTimer() {
  feedbackMsg.value = `¡Prepárate! La partida empieza en ${preparationTime.value}s`;
  let interval = setInterval(() => {
    preparationTime.value--;
    feedbackMsg.value = `¡Prepárate! La partida empieza en ${preparationTime.value}s`;
    if (preparationTime.value <= 0) {
      clearInterval(interval);
      feedbackMsg.value = "¡YA!";
    }
  }, 1000);
}

function startGameTimer() {
  let interval = setInterval(() => {
    gameTime.value--;
    if (gameTime.value <= 0) {
      clearInterval(interval);
    }
  }, 1000);
}

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (videoRef.value && canvasRef.value) {
    poseDetectionService = new PoseDetectionService(
      videoRef.value,
      canvasRef.value
    );
    poseDetectionService.onPoseEstimate = handlePoseEstimate;
    await poseDetectionService.initialize();
    const cameraStarted = await poseDetectionService.startCamera();

    if (cameraStarted) {
      isCameraReady.value = true;
      wsStore.sendMessage({
        action: "player_game_ready",
        payload: { roomId: props.sessionId },
      });
      // --- NUEVO --- Pedimos el estado inicial del leaderboard
      wsStore.sendMessage({
        action: "request_initial_leaderboard",
        payload: { roomId: props.sessionId },
      });

      poseDetectionService.loop();
    }
  }
});

onBeforeUnmount(() => {
  if (poseDetectionService) {
    poseDetectionService.stop();
  }
});

// --- CAMBIO 2: Watch mejorado para escuchar el Leaderboard ---
watch(
  () => wsStore.lastMessage,
  (newMessage) => {
    if (!newMessage) return;

    switch (newMessage.action) {
      case "initial_leaderboard":
      case "leaderboard_update":
        // El servidor ahora siempre envía la lista completa y ordenada.
        // Simplemente la reemplazamos.
        if (newMessage.payload && newMessage.payload.leaderboard) {
          leaderboard.value = newMessage.payload.leaderboard;
        }
        break;

      case "all_players_ready":
        areAllPlayersReady.value = true;
        startPreparationTimer();
        break;

      case "start_game_countdown":
        isGameRunning.value = true;
        startGameTimer();
        break;

      case "game_over":
        isGameRunning.value = false;
        isGameFinished.value = true;
        finalLeaderboard.value = newMessage.payload.leaderboard;
        break;

      // Opcional: Si quieres mostrar el mensaje de récord personal
      case "new_global_record":
        // Podrías usar un toast/notificación aquí
        console.log("RECORD:", newMessage.payload.message);
        feedbackMsg.value = "🏆 ¡NUEVO RÉCORD!"; // Feedback visual rápido
        break;
    }
  }
);
</script>

<template>
  <div class="page-container">
    <div v-if="!areAllPlayersReady" class="overlay">
      <div class="overlay-content">
        <h2 class="overlay-title">Esperando al resto de jugadores...</h2>
        <p v-if="!isCameraReady">Iniciando cámara y modelo...</p>
        <p v-else>¡Ya estás listo!</p>
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
      </div>
    </div>

    <div v-if="isGameFinished" class="overlay">
      <div class="overlay-content results-panel">
        <h2 class="overlay-title">¡Partida Terminada!</h2>
        <h3 class="leaderboard-title">Resultados Finales</h3>
        <ol class="leaderboard-list">
          <li
            v-for="(p, index) in finalLeaderboard"
            :key="p.username"
            :class="{ 'highlight-self': p.username === props.username }"
          >
            <strong>{{ index + 1 }}. {{ p.username }}</strong>
            : {{ p.reps }}
          </li>
        </ol>
        <v-btn color="primary" @click="$router.push('/lobby')" class="mt-4">
          Volver al Lobby
        </v-btn>
      </div>
    </div>

    <div class="video-container">
      <video
        ref="videoRef"
        playsinline
        muted
        autoplay
        class="video-feed"
      ></video>
    </div>

    <div class="sidebar">
      <canvas ref="canvasRef" class="skeleton-canvas"></canvas>

      <div class="ui-panel">
        <h3 class="title">{{ exercise }}</h3>

        <div v-if="isGameRunning" class="game-timer">
          Tiempo restante: {{ gameTime }}s
        </div>

        <div class="counter-box">
          <div class="counter-value">{{ repCounter }}</div>
          <div class="counter-label">Repeticiones</div>
        </div>

        <div class="feedback-box">
          <div class="feedback-message">{{ feedbackMsg }}</div>
        </div>

        <div class="leaderboard-panel">
          <h4 class="leaderboard-title">
            Leaderboard (Sala: {{ props.sessionId }})
          </h4>

          <ol class="leaderboard-list">
            <li
              v-for="(p, index) in leaderboard"
              :key="p.userId"
              :class="{ 'highlight-self': p.username === props.username }"
            >
              <div class="player-info">
                <strong>{{ index + 1 }}. {{ p.username }}</strong>
              </div>
              <div class="player-reps">
                {{ p.reps }}
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <v-btn
      color="primary"
      icon
      size="large"
      class="chat-toggle-button"
      @click="toggleChat"
    >
      <v-icon>{{ chatOpen ? "mdi-close" : "mdi-chat" }}</v-icon>
    </v-btn>

    <div class="chat-panel" :class="{ 'chat-panel-open': chatOpen }">
      <Chat
        :messages="chatMessages"
        :username="props.username"
        @send-message="handleSendMessage"
      />
    </div>
  </div>
</template>

<style scoped>
/* Tus estilos originales se mantienen igual. 
   He añadido un par de ajustes menores para la lista */

.page-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  color: white;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  color: white;
}

.overlay-content {
  text-align: center;
  padding: 40px;
  background: #1e1e1e;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.overlay-title {
  font-size: 2rem;
  margin-bottom: 20px;
}

.results-panel .leaderboard-list {
  text-align: left;
  margin-top: 20px;
  width: 300px;
}

.game-timer {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffc107;
  margin-bottom: 10px;
}

.video-container {
  flex: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  padding: 20px;
  box-sizing: border-box;
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  padding: 20px;
  box-sizing: border-box;
  gap: 20px;
  height: 100vh;
  overflow-y: auto;
}

.skeleton-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
}

.ui-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin: 0;
  color: #f5f5f5;
}

.counter-box {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 8px solid #00c8ff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
}

.counter-value {
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 1;
}

.counter-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #ccc;
  margin-top: 5px;
}

.feedback-box {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.feedback-message {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffc107;
  min-height: 1.25em;
}

.leaderboard-panel {
  width: 100%;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.leaderboard-title {
  font-size: 1.1rem;
  margin: 0 0 10px 0;
  color: #00c8ff;
  text-align: center;
}

.leaderboard-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 1rem;
}

.leaderboard-list li {
  padding: 8px 5px; /* Un poco más de padding */
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.leaderboard-list li:last-child {
  border-bottom: none;
}

.highlight-self {
  font-weight: bold;
  color: #ffc107; /* Amarillo/Oro para resaltar al usuario */
  background-color: rgba(255, 193, 7, 0.15);
  border-radius: 4px;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.chat-toggle-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.chat-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 360px;
  height: 450px;
  z-index: 99;
  transform: translateY(calc(100% + 20px));
  transition: transform 0.3s ease-in-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  background-color: #363636;
  backdrop-filter: none;
}

.chat-panel-open {
  transform: translateY(0);
}

@media (max-width: 600px) {
  .chat-panel {
    width: calc(100% - 40px);
    height: 70vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
}
</style>
