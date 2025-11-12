<template>
  <v-app>
    <v-main>
      <ProfileMenu v-if="isLoggedIn && !isGamePage" />
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWebSocketStore } from '@/stores/websocket';
import ProfileMenu from '@/components/ProfileMenu.vue';

const wsStore = useWebSocketStore();
const route = useRoute();
const socketURL = import.meta.env.VITE_SOCKET_URL || "ws://localhost:3000";

const isLoggedIn = ref(false);

// Hide profile menu on game screen
const isGamePage = computed(() => route.name === 'sala');

const checkLoginStatus = () => {
  isLoggedIn.value = !!localStorage.getItem('fithub-token');
};

onMounted(() => {
  checkLoginStatus();
  const username = localStorage.getItem('username');
  if (username) {
    wsStore.connect(`${socketURL}?username=${encodeURIComponent(username)}`);
  }
});

// Watch for route changes to update login status (e.g., after logout)
watch(() => route.path, () => {
  checkLoginStatus();
});
</script>



<style></style>
