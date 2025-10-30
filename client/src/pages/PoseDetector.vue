<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import PoseFeatures from '@/components/PoseFeatures.vue'; 
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";


const videoRef = ref(null);
const canvasRef = ref(null);
const detectedKeypoints = ref([]); 

let currentStream = null; 
let detector = null; 
let rafId = null; 

// 1) Obrir la càmera
// ... (La funció startCamera() es manté sense canvis)
async function startCamera() {
  try {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
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
    alert(
      "No s’ha pogut accedir a la càmera. Revisa permisos i que hi hagi una webcam disponible."
    );
  }
}

// 2) Dibuixar esquelet (punts + línies) al canvas
// ... (La funció drawSkeleton() es manté sense canvis)
function drawSkeleton(ctx, keypoints) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const pairs = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.MoveNet
  );
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
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

  ctx.fillStyle = "#ffffff";
  for (const kp of keypoints) {
    if ((kp.score ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 3) Bucle principal: estima la pose i dibuixa
async function loop() {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas || !detector || video.readyState !== 4) { // ERROR CORREGIT 2: Comprovar readyState
    rafId = requestAnimationFrame(loop);
    return;
  }

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
    // CLAU: Actualitzar el ref per passar-lo a PoseFeatures
    detectedKeypoints.value = poses[0].keypoints; 
    drawSkeleton(ctx, poses[0].keypoints);
  } else {
    detectedKeypoints.value = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  rafId = requestAnimationFrame(loop);
}

// 4) Inicialització i neteja
onMounted(async () => {
  await tf.setBackend("webgl");
  // ERROR CORREGIT 3 (MÉS SIMPLE): no cal cridar tf.ready() abans, ja es fa internament
  
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
  if (rafId) cancelAnimationFrame(rafId);
  if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
  detector = null;
  // Neteja l'estat en desmuntar
  detectedKeypoints.value = [];
});
</script>

<template>
  <v-container fluid class="fill-height">
    <v-row no-gutters>
      <v-col cols="12" md="9">
        <div class="wrap">
          <div class="stage">
            <video ref="videoRef" playsinline muted autoplay class="video"></video>
            <canvas ref="canvasRef" class="overlay"></canvas>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="3">
        <PoseFeatures :keypoints="detectedKeypoints" />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/*
  He mantingut la majoria dels teus estils, però he afegit contenidors de Vuetify
  (v-container, v-row, v-col) a la plantilla per tenir un layout responsive.
*/
.wrap {
  /* Envolcall del vídeo en una sola columna */
  display: flex; 
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 15px; /* Petit padding per no enganxar a les vores */
}
.stage {
  position: relative;
  width: 100%;
  max-width: 640px; /* Limitem la mida per a pantalles grans */
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.video,
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; 
}
</style>