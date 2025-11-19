<template>
  <div class="countdown-overlay">
    <div class="countdown-content">
      <p class="countdown-text">{{ countdown }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  countdown: Number,
});
</script>

<style scoped>
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 300;
  color: white;
}

.countdown-content {
  text-align: center;
}

.countdown-text {
  font-size: 15rem;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>
