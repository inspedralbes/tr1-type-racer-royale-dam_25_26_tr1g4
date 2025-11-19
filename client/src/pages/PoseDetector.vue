<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import Chat from "@/components/Chat.vue";
import Countdown from "@/components/Countdown.vue";
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
const preparationTime = ref(3);
const gameTime = ref(60);
const isGameRunning = ref(false);
const isGameFinished = ref(false);
const showCountdown = ref(false);
const countdown = ref(3);

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
  showCountdown.value = true;
  countdown.value = 10;
  let interval = setInterval(() => {
    countdown.value--;
    if (countdown.value === 0) {
      clearInterval(interval);
      showCountdown.value = false;
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
    <Countdown v-if="showCountdown" :countdown="countdown" />
    <div v-if="!areAllPlayersReady" class="overlay">
      <div class="overlay-content">
        <h2 class="overlay-title">Esperando al resto de jugadores...</h2>
        <p v-if="!isCameraReady">Iniciando cámara y modelo...</p>
        <p v-else>¡Ya estás listo!</p>

        <v-progress-circular
          indeterminate
          color="#ffc107"
          size="64"
          class="mt-4"
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

        <v-btn
          color="primary"
          @click="$router.push('/lobby')"
          class="mt-4 primary-action-btn"
          rounded="lg"
          variant="tonal"
          elevation="6"
        >
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

        <!-- Game Timer -->

        <!-- Game Timer -->
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

    <!-- Chat Button -->

    <v-btn
      icon
      size="large"
      class="chat-toggle-button"
      @click="toggleChat"
      color="white"
    >
      <v-icon>{{ chatOpen ? "mdi-close" : "mdi-chat" }}</v-icon>
    </v-btn>

    <!-- Chat Panel -->

    <!-- Chat Panel -->
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
/* Tipografia Cutive Mono per a tots els elements d'UI */
.title,
.game-timer,
.feedback-message,
.leaderboard-title,
.counter-label,
.counter-value,
.results-panel,
.overlay-content h2,
.overlay-content p {
  font-family: "Cutive Mono", monospace !important;
  letter-spacing: 1px;
}

.page-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0d0d0d; /* Fons molt fosc */
  color: white;
}

.primary-action-btn {
  font-family: "Cutive Mono", monospace !important;
  font-weight: 400;
  letter-spacing: 1px;
  background-color: rgba(
    168,
    160,
    160,
    0.1
  ) !important; /* Fons subtil per la variant tonal */
}
.primary-action-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  border-bottom: 2px solid #ffc107; /* Accent de l'hover amb color taronja */
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.overlay-content {
  /* Utilitza l'estil del frosted-card del login */
  background: #1e1e1e;
  border: 2px solid #402c42;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);
  padding: 40px;
  text-align: center;
}

.overlay-title {
  color: #ffc107;
}

.results-panel .leaderboard-list {
  width: 100%; /* Ajustem l'amplada de la llista dins del panell */
}

.game-timer {
  font-size: 1.6rem;
  font-weight: bold;
  color: #00c8ff; /* Color cian per al temps */
  padding: 5px 15px;
  border: 1px solid #00c8ff;
  border-radius: 4px;
}

.video-container {
  flex: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  padding: 10px;
  box-sizing: border-box;
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2); /* Ombra subtil de neó */
}

.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* Fons fosc i opac similar al frosted-card */
  background: #1e1e1e;
  padding: 20px;
  box-sizing: border-box;
  gap: 20px;
  height: 100vh;
  overflow-y: auto;
  /* Borda i ombra cohesionada */
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border-left: 2px solid #3d2242; /* Vora fosca d'accent */
}

.skeleton-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  border: 1px solid #402c42;
}

.ui-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.title {
  color: #ffc107; /* Color d'accent per al títol */
  font-size: 1.8rem;
  text-transform: uppercase;
  border-bottom: 2px dashed rgba(255, 193, 7, 0.3);
  padding-bottom: 5px;
  margin-top: 5px;
}

.counter-box {
  width: 100%;
  padding: 15px 10px;
  text-align: center;
  /* Fons i vora estilitzats */
  background-color: #2a2a2a; /* Color fosc 'filled' */
  border-radius: 8px;
  border: 3px solid #00c8ff; /* Vora cian destacada */
  box-shadow: 0 0 10px rgba(0, 200, 255, 0.5); /* Efecte neó suau */
}

.counter-value {
  font-size: 5rem;
  color: #00c8ff; /* Cian destacat */
  text-shadow: 0 0 10px rgba(0, 200, 255, 0.8);
}

.counter-label {
  color: #ccc;
}

.feedback-box,
.leaderboard-panel {
  width: 100%;
  padding: 15px;
  border-radius: 8px;
  background: #2a2a2a; /* Color fosc 'filled' */
  border: 1px solid #402c42;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.feedback-message {
  color: #ffc107;
  font-size: 1.1rem;
  text-align: center;
}

.leaderboard-title {
  color: #ffc107; /* Taronja per al títol del leaderboard */
  font-weight: 600 !important;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 193, 7, 0.1);
  padding-bottom: 5px;
}

.leaderboard-list {
  list-style-type: none;
  padding: 0;
  color: #f5f5f5;
}

.leaderboard-list li {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}

.leaderboard-list li:hover {
  background-color: rgba(64, 44, 66, 0.3);
}

.leaderboard-list li:last-child {
  border-bottom: none;
}

.highlight-self {
  color: #ffc107; /* Resaltem l'usuari amb el color d'accent */
  font-weight: 700 !important;
  background-color: rgba(255, 193, 7, 0.1) !important;
  border-radius: 4px;
}

.chat-toggle-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
  /* Estil del botó d'acció principal */
  background-color: #402c42 !important; /* Color fosc d'accent */
  color: #ffffff !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.chat-toggle-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  background-color: #5c3b60 !important;
}

.overlay-content {
  /* Afegim el fons fosc i la vora subtil del 'frosted-card' */
  background: #1e1e1e;
  border: 1px solid #402c42;
  color: #fafcffff;
}

.overlay-title {
  color: hsla(276, 70%, 91%, 0.897) !important;
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
  /* Fons de xat fosc i opac */
  background-color: #2a2a2a;
}

.chat-panel-open {
  transform: translateY(0);
}

@media (max-width: 600px) {
  .page-container {
    flex-direction: column;
  }
  .video-container {
    flex: none;
    height: 60vh;
    padding: 10px;
  }
  .sidebar {
    flex: none;
    height: 40vh;
    border-left: none;
    border-top: 2px solid #3d2242;
  }
  .chat-panel {
    width: calc(100% - 40px);
    height: 50vh;
    right: 20px;
    left: 20px;
    bottom: 20px;
  }
  .chat-toggle-button {
    bottom: 80px; /* Pujar el botó per damunt del panell de xat */
    right: 30px;
  }
}
</style>
