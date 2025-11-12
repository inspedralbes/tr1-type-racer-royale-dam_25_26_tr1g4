<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
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
  exercise: String, // The name of the exercise from the route
});

// WebSocket related computed properties
const leaderboard = computed(() => wsStore.roomState?.players || []);
const chatMessages = computed(() => wsStore.chatMessages);

// Refs for video and canvas elements
const videoRef = ref(null);
const canvasRef = ref(null);

// Exercise state
const repCounter = ref(0);
const exerciseState = ref("up"); // 'up' or 'down'
const feedbackMsg = ref("¡Prepárate!");

// Pose detection service instance
let poseDetectionService = null;

// --- WebSocket Functions ---
function sendRepetitionUpdate(count) {
  const message = {
    action: "update_reps",
    payload: {
      userId: props.userId,
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
  repCounter.value++;
  sendRepetitionUpdate(repCounter.value);
};

const handleFeedback = (message) => {
  feedbackMsg.value = message;
};

// --- Main Pose Estimation Handler ---
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

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (videoRef.value && canvasRef.value) {
    poseDetectionService = new PoseDetectionService(videoRef.value, canvasRef.value);
    
    poseDetectionService.onPoseEstimate = handlePoseEstimate;

    await poseDetectionService.initialize();
    const cameraStarted = await poseDetectionService.startCamera();
    
    if (cameraStarted) {
      poseDetectionService.loop();
    }
  }
});

onBeforeUnmount(() => {
  if (poseDetectionService) {
    poseDetectionService.stop();
  }
});
</script>

<template>
  <div class="page-container">
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
        <h3 class="title">Full Body Squat</h3>

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
              :key="p.username"
              :class="{ 'highlight-self': p.username === props.username }"
            >
              <strong>{{ index + 1 }}. {{ p.username }}</strong
              >: {{ p.reps }}
            </li>
          </ol>
        </div>
      </div>
    </div>

    <div class="chat-panel">
      <Chat
        :messages="chatMessages"
        :username="props.username"
        @send-message="handleSendMessage"
      />
    </div>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  color: white;
}

.video-container {
  flex: 3; /* Ocupa 3/4 parts de l'espai */
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
  object-fit: contain; /* 'contain' per evitar deformacions */
  border-radius: 12px;
}

.sidebar {
  flex: 1; /* Ocupa 1/4 part de l'espai */
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
  aspect-ratio: 16 / 9; /* Mantenir la proporció del vídeo */
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
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 1rem;
}

.leaderboard-list li {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.leaderboard-list li:last-child {
  border-bottom: none;
  border-bottom: none;
}

.highlight-self {
  font-weight: bold;
  color: #ffc107;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 5px;
  margin: 2px 0;
  border-radius: 4px;
}

.chat-panel {
  position: absolute;
  bottom: 15px; /* Ligeramente más abajo */
  left: 15px; /* Ligeramente más a la derecha */
  width: 350px;
  z-index: 10;
}
</style>
