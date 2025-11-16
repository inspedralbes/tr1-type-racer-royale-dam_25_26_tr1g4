<template class="lobby">
  <div>
    <v-app-bar
      class="minimal-nav" 
      dark 
      flat
      height="58"> 
      
      <v-toolbar-title class="text-h5 nav-title font-weight-light">
        <v-icon left color="rgba(0, 0, 0, 1)">mdi-run-fast</v-icon> 
        FitAI<span class="font-weight-bold ml-1">AI</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn text class="nav-item">
        INICI
      </v-btn>

      <v-btn text class="nav-item">
        PANELL
      </v-btn>
      
      <v-btn text class="nav-item">
        PLANS
      </v-btn>

      <v-btn 
        fab 
        small 
        class="nav-profile-btn"
      >
        <v-icon>mdi-account</v-icon>
      </v-btn>

    </v-app-bar>

    </div>
<v-container class="pb-0 pt-15" style="background-color: transparent;">
<v-row justify="center" align-start>
<v-col cols="12" md="6" sm="12" class="pa-0 pa-md-2">
<v-card class="frosted-card elevation-12" hover rounded="lg" 
 color="#000000c4"
>
<v-tabs v-model="tab" bg-color="transparent" fixed-tabs color="#ffffff" class="cutive-mono-tabs">
<v-tab value="private">Sala Privada</v-tab>
<v-tab value="public">Salas Públicas</v-tab>
</v-tabs>

 <v-window v-model="tab">
<v-window-item value="private">
<v-card-text class="pa-5">
    <v-btn @click="crearSala" block size="large" class="mb-6 primary-action-btn" color="rgba(168, 160, 160, 1)" :loading="loading" rounded="lg" elevation="6" variant="tonal">
    Crear Sala Privada
    </v-btn>
    <v-divider class="mb-4 card-divider-style"></v-divider>
    <v-alert v-if="errorMessage" type="error" class="mb-4" closable @click:close="errorMessage = ''" color="#FF5252" variant="tonal">
    {{ errorMessage }}
    </v-alert>
    
    <v-form @submit.prevent="unirseSalaPrivada">
        <h3 class="mb-3" style="font-family: 'Cutive Mono', monospace; color: #ffffff;">Unirse a Sala Existent</h3>
        <br></br>
        <br></br>
        <v-text-field v-model="salaPrivada.id" label="ID de la Sala" prepend-inner-icon="mdi-pound" variant="outlined" class="mb-3 v-text-field" :disabled="loading" required dark filled></v-text-field>
        <br></br>
        <v-btn type="submit" block color="rgba(168, 160, 160, 1)" size="large" :loading="loading" class="mb-6 primary-action-btn" variant="tonal" elevation="6">
        Unirse
        </v-btn>
    </v-form>

    <v-divider class="mb-4 card-divider-style"></v-divider>
</v-card-text>
</v-window-item>

<v-window-item value="public">
<v-card-text class="pa-5">
<br></br>
    <h3 class="mb-4" style="font-family: 'Cutive Mono', monospace; color: #ffffff;">Salas Públicas Disponibles</h3>

    <v-list lines="two" bg-color="transparent" class="cutive-mono-list">
  <v-list-item v-for="sala in salasPublicas" :key="sala.id" :title="`Sala ${sala.id}`" :subtitle="`Ejercicio: ${sala.exercise}`">
    <template v-slot:append>
    <v-chip class="mr-4" color="rgba(255, 255, 255, 0.2)" label size="small" variant="flat">{{ sala.jugadores }} / {{ sala.maxJugadores }}</v-chip>
    <v-btn @click="unirseSalaPublica(sala.id)" :disabled="sala.jugadores >= sala.maxJugadores || loading" color="#ffffff" variant="text" class="secondary-action-btn">
    {{ sala.jugadores >= sala.maxJugadores ? "Llena" : "Unirse" }}
    </v-btn>
    </template>
    </v-list-item>
    </v-list>
    <v-alert v-if="!loading && salasPublicas.length === 0" type="info" variant="tonal" class="mt-4" color="#402c42">
    No hay salas públicas disponibles en este momento.
    </v-alert>

    <v-divider class="my-6"></v-divider>

     <h3 class="mb-4" style="font-family: 'Cutive Mono', monospace; color: #ffffff;">o crear sala Pública</h3>

    <h3 class="mb-4">
    o Crear una Sala Pública</h3>
    <v-btn @click="crearSalaPublica" block size="large" class="mb-6 primary-action-btn" color="rgba(168, 160, 160, 1)" :loading="loading" rounded="lg" elevation="6" variant="tonal">
    Crear Sala Pública
    </v-btn>
    <br></br>
    
</v-card-text>
</v-window-item>
</v-window>

</v-card>
 </v-col>

 <v-col cols="12" md="6" sm="12" class="pa-0 pa-md-2 mt-0">
 <v-card class="elevation-12 leaderboard-panel rounded-lg" color="#000000c4">
 <v-card-title class="text-center text-white v-card-title" style="background-color: #121212; border-radius: 8px 8px 0 0;">
 Tabla de Clasificación Global
</v-card-title>

 <GlobalLeaderboard />
</v-card>
</v-col>
    
</v-row>  
 </v-container>
</template>

<script setup>
import GlobalLeaderboard from '../components/GlobalLeaderboard.vue';
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useWebSocketStore } from "@/stores/websocket";
import { SOCKET_URL } from "@/api";

const router = useRouter();
const wsStore = useWebSocketStore();

const tab = ref("private");
const loading = ref(false);


const salaPrivada = ref({ id: "" });

// Computed properties from store
const salasPublicas = computed(() => wsStore.publicRooms);
const errorMessage = computed({
  get: () => wsStore.error,
  set: (value) => { wsStore.error = value; }
});

// Watch for room state changes to navigate
watch(() => wsStore.roomState, (newState) => {
  if (newState && newState.roomId) {
    loading.value = false;
    router.push({ name: "room", params: { roomId: newState.roomId } });
  }
});

function crearSala() {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'create_room', payload: {} });
}

function crearSalaPublica() {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'create_public_room', payload: {} });
}

function unirseSalaPrivada() {
  if (!salaPrivada.value.id) {
    wsStore.error = "Por favor, introduce un ID de sala.";
    return;
  }
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: salaPrivada.value.id } });
}

function unirseSalaPublica(idSala) {
  loading.value = true;
  wsStore.error = null;
  wsStore.sendMessage({ action: 'join_room', payload: { roomId: idSala } });
}

// --- Lifecycle ---
onMounted(() => {
  loading.value = true;
  const username = localStorage.getItem("username");
  if (!username) {
    wsStore.error = "Error de autenticación. Por favor, inicia sesión de nuevo.";
    loading.value = false;
    return;
  }

  const connectAndFetch = () => {
    wsStore.sendMessage({ action: 'get_public_rooms', payload: {} });
    loading.value = false;
  };

  if (wsStore.isConnected) {
    connectAndFetch();
    return;
  }

  const connectionTimeout = setTimeout(() => {
    if (!wsStore.isConnected) {
      wsStore.error = "No se pudo conectar con el servidor de salas.";
      loading.value = false;
    }
  }, 5000);

  const unwatch = watch(() => wsStore.isConnected, (isConnected) => {
    if (isConnected) {
      clearTimeout(connectionTimeout);
      connectAndFetch();
      unwatch(); // Stop watching after connection
    }
  });

  const socketURL = (SOCKET_URL || 'ws://localhost:3000/').replace(/^http/, 'ws');
  wsStore.connect(`${socketURL}?username=${encodeURIComponent(username)}`);
});
</script>

<style scoped>


.minimal-nav {
    /* El fons ha de ser fosc, gairebé transparent o negre sòlid */
    background-color: rgba(0, 0, 0, 0.95) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; /* Línia de separació molt subtil */
}

.nav-title {
    font-family: 'Inter', sans-serif;
    letter-spacing: 1.5px; 
    font-weight: 300 !important; 
    color: #ffffff !important;
}

.nav-title .font-weight-bold {
    color: rgba(241, 255, 248, 1); 
}

.nav-item {
    font-family: 'Inter', sans-serif;
    color: rgba(255, 255, 255, 0.7) !important; 
    font-weight: 400;
    letter-spacing: 1.2px;
    margin: 0 12px;
    padding: 0 5px;
    transition: color 0.2s;
    text-transform: uppercase;
}

.nav-item:hover {
    color: #ffffff !important; 
    border-bottom: 2px solid hsla(151, 100%, 95%, 1.00); 
    padding-bottom: 6px;
}

.nav-profile-icon .v-icon {
    color: rgba(255, 255, 255, 0.5) !important; 
}

.nav-profile-icon:hover .v-icon {
    color: #ffffff !important; 
}
.pa-5 {
  padding: 2.5rem;
}
.mb-4 {
  margin-bottom: 1.5rem;
}
.mb-3 {
  margin-bottom: 1rem;
}
.mb-6 {
  margin-bottom: 2rem;
}


.primary-action-btn{
  font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 3px;
}

.frosted-card {
  .frosted-card {
box-shadow: 
0 4px 6px -1px rgba(0, 0, 0, 0.2), 
0 10px 15px -3px rgba(0, 0, 0, 0.4); 
border: 1px solid #402c42; 
border-radius: 2px; 
color: hsl(216, 100%, 99%); 

/* ✨ CANVI: Augmentem el padding per fer-la més gran internament */
 padding: 35px 45px; 

position: sticky;
overflow: hidden;
transition: transform 0.3s ease-out, box-shadow 0.3s ease-out; 
}
}


.frosted-card :deep(.v-field__input) {
  background-color: #2a2a2a !important; /* Cohesió amb v-input__control */
  color: lab(82.54% -1.02 -0.37); 
  border-radius: 4px;
 
}

.primary-action-btn:hover {
    opacity: 0.9; 
    transform: translateY(-1px); 
    border-bottom: 2px solid #f7fffb; /* Eliminem el border bottom que xoca amb el flat button */
  
}

/* Modificació del secondary-action-btn per als botons Unirse/Llena */
.secondary-action-btn {
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 3px;

}

.v-card-title {
color: rgb(187, 174, 174) !important; 
 position: center; 
 /* Valors ajustats per reduir l'alçada i igualar v-tabs */
 padding-top: 8px !important; 
 padding-bottom: 8px !important; 
font-family: 'Cutive Mono', monospace !important; 
font-weight: 200 ;
letter-spacing: 1px;
font-size: 1.4rem !important;
}
/* Estil específic per al h3 d'Unirse */
.h3-style {
    font-size: 1.25rem;
    font-weight: 300 !important;
}

.v-text-field{
    font-family: 'Cutive Mono', monospace !important; 
    font-weight: 400 ;
    letter-spacing: 1px;
    color: lch(67.41% 5.41 19.81) !important;
}

.cutive-mono-tabs :deep(.v-tab:not(.v-tab--selected) .v-btn__content) {
    color: #ffffff !important; 
    opacity: 0.7 !important; /* Lleugera opacitat per distingir de l'activa */
}

/* 2. Força el color blanc sobre la pestanya seleccionada (Activa) */
.cutive-mono-tabs :deep(.v-tab--selected .v-btn__content) {
    color: #ffffff !important; 
    font-weight: 700 !important;
}

/* Mantenim el fons de la pestanya seleccionada, però ajustem l'element v-btn__content */
.cutive-mono-tabs :deep(.v-tab--selected) {
    background-color: rgba(73, 255, 155, 0.05) !important;
}
/* Estil per a la línia divisòria (fosc i subtil) */
.card-divider-style {
    border-color: rgba(255, 255, 255, 0.1) !important;
}
.cutive-mono-list {
    color: hwb(0 100% 0%) !important;
}

.list-item-style {
    border-bottom: 1px solid #ffffff; /* Separador subtil */
    padding: 10px 0;
    transition: background-color 0.2s;
}

.list-item-style:hover {
    background-color: #ecdede !important;
}

.list-item-style :deep(.v-list-item-title) {
    font-family: 'Cutive Mono', monospace !important;
    color: hwb(0 88% 0%) !important;
    font-weight: 700;
}
.list-item-style :deep(.v-list-item-subtitle) {
    font-family: 'Cutive Mono', monospace !important;
    color: hsla(0, 100%, 92%, 0.702) !important;
}

.lobby {
    background: linear-gradient(
    135deg, 
    #121212 0%,      
    #21004C 70%,      
    #4A148C 100%     
  );
  background-attachment: fixed !important;
}
</style>
