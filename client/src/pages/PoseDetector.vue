<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

//Nous props : dades esencials de l'user/sala
const props = defineProps({
  sessionId: String,
  userId: String,
  username: String,
});

//nou estat reactiu de websockets i leaderboard:
const ws = ref(null);
const isConnected = ref(false);
const leaderboard = ref([]); // array de classificació en temps real
//-------------------------

const videoRef = ref(null);
const canvasRef = ref(null);

const repCounter = ref(0); // Contador de repeticiones
const exerciseState = ref("up"); // Estado actual del ejercicio ('up' o 'down')
const feedbackMsg = ref("¡Prepárate!"); // Feedback en tiempo real

let currentStream = null; // guardem l'stream actiu per poder-lo aturar
let detector = null; // detector MoveNet
let rafId = null; // id de requestAnimationFrame del bucle

const keypointNames = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

// Funció auxiliar per obtenir un keypoint pel seu nom
function getKp(keypoints, name) {
  const index = keypointNames.indexOf(name);
  if (index === -1 || !keypoints || keypoints.length <= index) return null;

  const kp = keypoints[index];
  if (kp && (kp.score ?? 1) > 0.3) {
    return kp;
  }
  return null;
}

//NOU: Calcula el ángulo (en grados) formado por tres puntos (articulaciones).
function calcularAngulo(a, b, c) {
  if (!a || !b || !c) return null;
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angulo = Math.abs((rad * 180.0) / Math.PI);
  if (angulo > 180) {
    angulo = 360 - angulo;
  }
  return angulo;
}

//Enviar  actualització de repeticions:
function sendRepetitionUpdate(count) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;

  // Payload que espera el servidor
  const message = {
    action: "update_reps",
    payload: {
      userId: props.userId,
      reps: count, // Enviar el nou TOTAL
    },
  };
  ws.value.send(JSON.stringify(message));
  console.log(`WS: Enviant update_reps: ${count}`);
}

//NOU: Función principal que analiza los keypoints para contar sentadillas y dar feedback.
function analizarSentadilla(keypoints) {
  const shoulder = getKp(keypoints, "left_shoulder");
  const hip = getKp(keypoints, "left_hip");
  const knee = getKp(keypoints, "left_knee");
  const ankle = getKp(keypoints, "left_ankle");

  if (!shoulder || !hip || !knee || !ankle) {
    feedbackMsg.value = "No te veo bien";
    return;
  }

  const anguloRodilla = calcularAngulo(hip, knee, ankle);
  const anguloEspalda = calcularAngulo(shoulder, hip, knee);

  if (anguloRodilla === null || anguloEspalda === null) return;

  const UMBRAL_ARRIBA = 160;
  const UMBRAL_ABAJO = 100;
  const UMBRAL_ESPALDA = 150;

  // LÓGICA DE FEEDBACK
  if (exerciseState.value === "down" && anguloEspalda < UMBRAL_ESPALDA) {
    feedbackMsg.value = "¡Espalda recta!";
  } else if (exerciseState.value === "down") {
    feedbackMsg.value = "¡Sube!";
  } else if (exerciseState.value === "up" && anguloRodilla > UMBRAL_ARRIBA) {
    feedbackMsg.value = "Baja...";
  }

  // LÓGICA de ESTADO (CONTADOR)
  if (anguloRodilla < UMBRAL_ABAJO && exerciseState.value === "up") {
    exerciseState.value = "down";
  }

  if (anguloRodilla > UMBRAL_ARRIBA && exerciseState.value === "down") {
    exerciseState.value = "up";
    repCounter.value++;
    feedbackMsg.value = "¡Bien!";

    // J NOU: Cridar al servidor WebSocket quan es completa una repetició
    sendRepetitionUpdate(repCounter.value);
  }
}

//J Connectar Websocket

function connectWebScoket() {
  // Construye la URL del WebSocket de forma dinámica
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const socketUrl = `${protocol}//${host}`;

  ws.value = new WebSocket(socketUrl);

  ws.value.onopen = () => {
    isConnected.value = true;
    console.log("WS: Connecció establerta, unint-se a sala");

    //unir-se a la sala
    ws.value.send(
      JSON.stringify({
        action: "join_room",
        payload: {
          sessionId: props.sessionId,
          userId: props.userId,
          username: props.username,
        },
      })
    );
  };
  ws.value.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.action === "leaderboard_update") {
      //Rep i actualitza el leaderboard
      console.log("Ws:leaderboard actualitzat");
    }
  };

  ws.value.onerror = (error) => {
    console.error("WS:error", error);
  };
}

// 1) Obrir la càmera
async function startCamera() {
  try {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    // Demanem 16:9, com a la conversa anterior
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    currentStream = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
    }
  } catch (err) {
    console.error("No s’ha pogut accedir a la càmera:", err);
    alert("No s’ha pogut accedir a la càmera.");
  }
}

// 2) Dibuixar esquelet (punts + línies) al canvas
function drawSkeleton(ctx, keypoints) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const pairs = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.MoveNet
  );
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00c8ff";

  // Dibuixem línies
  for (const [i, j] of pairs) {
    const a = keypoints[i],
      b = keypoints[j];
    if (!a || !b) continue;
    if ((a.score ?? 1) < 0.3 || (b.score ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Dibuixem punts
  ctx.fillStyle = "#ffffff"; // Punts blancs
  for (const kp of keypoints) {
    if ((kp.score ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 3) Bucle principal: estima la pose i dibuixa
async function loop() {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas || !detector) return;

  // Aquesta lògica és clau: ajusta la RESOLUCIÓ del canvas
  // a la resolució REAL del vídeo. El CSS s'encarrega d'ESCALAR-HO.
  if (
    canvas.width !== video.videoWidth ||
    canvas.height !== video.videoHeight
  ) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const poses = await detector.estimatePoses(video, {
    maxPoses: 1,
    flipHorizontal: true,
  });

  const ctx = canvas.getContext("2d");
  if (poses[0]?.keypoints) {
    const kps = poses[0].keypoints;
    drawSkeleton(ctx, kps);
    analizarSentadilla(kps);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    feedbackMsg.value = "Buscando persona...";
  }

  rafId = requestAnimationFrame(loop);
}

// 4) Inicialització i neteja
onMounted(async () => {
  //J Iniciar connexió amb websocket

  connectWebScoket();

  await tf.setBackend("webgl");
  await tf.ready();
  await startCamera();
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    }
  );
  loop();
});

onBeforeUnmount(() => {
  //J tancar la connexió Websocket
  if (ws.value) {
    ws.value.close();
  }

  if (rafId) cancelAnimationFrame(rafId);
  if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
  detector = null;
});
</script>

<template>
  <div class="main-container">
    <video
      ref="videoRef"
      playsinline
      muted
      autoplay
      class="video-background"
    ></video>
    <canvas ref="canvasRef" class="canvas-overlay"></canvas>

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
</template>

<style scoped>
.main-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
}

.video-background,
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-background {
  z-index: 0;
}

.canvas-overlay {
  z-index: 1;
}

.ui-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 280px;
  background: rgba(30, 30, 30, 0.85);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
  gap: 30px;
  color: white;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin: 0;
  color: #f5f5f5;
}

.counter-box {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  border: 9px solid #00c8ff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
}

.counter-value {
  font-size: 5.5rem;
  font-weight: 700;
  line-height: 1;
}

.counter-label {
  font-size: 1rem;
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
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffc107;
  min-height: 1.5em;
}

.leaderboard-panel {
  width: 100%;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-top: 10px;
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
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}

.leaderboard-list li:last-child {
  border-bottom: none;
}

.highlight-self {
  font-weight: bold;
  color: #ffc107; /* Color de realç per a l'usuari actual */
  background-color: rgba(255, 255, 255, 0.1);
  padding: 5px;
  margin: 2px 0;
  border-radius: 4px;
}
</style>
