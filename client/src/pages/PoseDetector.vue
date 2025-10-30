<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useSocketStore } from '@/stores/socket';
import PoseFeatures from '@/components/PoseFeatures.vue';

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

const socketStore = useSocketStore();

const videoRef = ref(null);
const canvasRef = ref(null);
const detectedKeypoints = ref([]);

let currentStream = null;
let detector = null;
let rafId = null;

async function startCamera() {
  try {
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    currentStream = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
    }
  } catch (err) {
    alert('Error accedint a la càmera.');
    console.error(err);
  }
}

function drawSkeleton(ctx, keypoints) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const pairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  for (const [i, j] of pairs) {
    const a = keypoints[i], b = keypoints[j];
    if (!a || !b) continue;
    if ((a.score ?? 1) < 0.3 || (b.score ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  for (const kp of keypoints) {
    if ((kp.score ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

async function loop() {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas || !detector || video.readyState !== 4) {
    rafId = requestAnimationFrame(loop);
    return;
  }

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const poses = await detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: true });
  const ctx = canvas.getContext('2d');

  if (poses[0]?.keypoints) {
    detectedKeypoints.value = poses[0].keypoints;
    drawSkeleton(ctx, poses[0].keypoints);

    // 🧠 Send keypoints to WS server
    socketStore.sendPose(poses[0].keypoints);
  } else {
    detectedKeypoints.value = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  rafId = requestAnimationFrame(loop);
}

onMounted(async () => {
  await tf.setBackend('webgl');
  await startCamera();
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  });
  loop();
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (currentStream) currentStream.getTracks().forEach(t => t.stop());
  detector = null;
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
.wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 15px;
}
.stage {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.video, .overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
