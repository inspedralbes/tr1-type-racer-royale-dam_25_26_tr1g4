import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

export class PoseDetectionService {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.detector = null;
    this.rafId = null;
    this.currentStream = null;
    this.onPoseEstimate = () => {}; // Callback for pose estimation
  }

  async initialize() {
    await tf.setBackend("webgl");
    await tf.ready();
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      }
    );
  }

  async startCamera() {
    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((t) => t.stop());
        this.currentStream = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      this.currentStream = stream;
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        await this.videoElement.play();
      }
      return true;
    } catch (err) {
      console.error("Could not access camera:", err);
      alert("Could not access camera. Pose detection will not be available.");
      return false;
    }
  }

  drawSkeleton(keypoints) {
    const ctx = this.canvasElement.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const pairs = poseDetection.util.getAdjacentPairs(
      poseDetection.SupportedModels.MoveNet
    );
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00c8ff";

    for (const [i, j] of pairs) {
      const a = keypoints[i],
        b = keypoints[j];
      if (!a || !b || (a.score ?? 1) < 0.3 || (b.score ?? 1) < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    for (const kp of keypoints) {
      if ((kp.score ?? 1) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async loop() {
    if (!this.videoElement || !this.canvasElement || !this.detector) return;

    if (
      this.canvasElement.width !== this.videoElement.videoWidth ||
      this.canvasElement.height !== this.videoElement.videoHeight
    ) {
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
    }

    const poses = await this.detector.estimatePoses(this.videoElement, {
      maxPoses: 1,
      flipHorizontal: true,
    });

    const ctx = this.canvasElement.getContext("2d");
    if (poses[0]?.keypoints) {
      const kps = poses[0].keypoints;
      this.drawSkeleton(kps);
      this.onPoseEstimate(kps); // Call the callback with the keypoints
    } else {
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.onPoseEstimate(null); // No pose found
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
    }
    this.detector = null;
  }
}
