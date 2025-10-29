<!-- src/components/PoseFeatures.vue -->
<script setup>
defineProps({
  // Més endavant li passarem keypoints/fps; ara només un placeholder
  message: { type: String, default: 'Encara sense dades…' }
})
</script>

<template>
  <aside class="panel">
    <h3>Features</h3>
    <p>{{ message }}</p>
    <ul>
      <li>Mean confidence: —</li>
      <li>Missing keypoints: —</li>
      <li>Angles (colze/genoll): —</li>
      <li>Torso tilt: —</li>
      <li>Wrist speed: —</li>
    </ul>
  </aside>
</template>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}
.panel h3 { margin: 0 0 8px; }
ul { margin: 8px 0 0; padding-left: 18px; }
</style>
