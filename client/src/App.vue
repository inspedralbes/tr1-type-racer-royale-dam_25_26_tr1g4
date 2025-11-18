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



<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 2. Aplicar el degradat al contenidor de l'App (Mantenir el teu codi) */
#app, .v-application {
  min-height: 100vh !important; /* Ús de !important per prioritzar */
  height: 100%; 
  
  background: #121212; 
  background: linear-gradient(
    135deg, 
    #121212 0%,      
    #21004C 70%,      
    #4A148C 100%     
  ) !important; /* FORÇA EL GRADIENT AMB MÀXIMA PRIORITAT */
  background-attachment: fixed;
}

/* 3. 🚨 PAS CRÍTIC: Neutralitzar el fons del contenidor principal de contingut */
.v-main {
  /* Si el teu fons de tema és blanc, el v-main el pot estar aplicant. */
  background-color: transparent !important; 
}
</style>

