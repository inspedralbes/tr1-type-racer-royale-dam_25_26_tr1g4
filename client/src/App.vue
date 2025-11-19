<template>

  <v-app>

    <v-main>

      

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

// NOU: Amagar el menú de perfil a les vistes de login i registre
const isAuthPage = computed(() => route.name === 'login' || route.name === 'register');



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
html,
body {

  height: 100%;

  margin: 0;

  padding: 0;

  overflow-x: hidden;
  /* Evitar scroll horitzontal no desitjat */

}



/* 2. Aplicar el degradat al contenidor de l'App (Mantenir el teu codi) */

#app,
.v-application {

  min-height: 100vh !important;
  /* Ús de !important per prioritzar */

  height: 100%;



  background: #121212;

  background: linear-gradient(135deg,

      #121212 0%,

      #21004C 70%,

      #4A148C 100%) !important;
  /* FORÇA EL GRADIENT AMB MÀXIMA PRIORITAT */

  background-attachment: fixed !important;

}



/* 🔥 PAS 2: ASSEGURA QUE ELS CONTENIDORS INTERNS SÓN TRANSPARENTS */

.v-main,
.v-application__wrap {

  /* Això sol ser la causa principal del problema de fons blanc */

  background-color: transparent !important;

}
</style>