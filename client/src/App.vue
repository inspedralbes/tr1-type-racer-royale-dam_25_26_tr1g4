<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
// ELIMINA TOTES LES IMPORTACIONS DE VISTES O COMPONENTS GRANS
// No importis PoseDetector, PoseFeatures, ni LoginView aquí.
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden; /* Evitar scroll horitzontal no desitjat */
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
  background-attachment: fixed !important;
}

/* 🔥 PAS 2: ASSEGURA QUE ELS CONTENIDORS INTERNS SÓN TRANSPARENTS */
.v-main, .v-application__wrap {
  /* Això sol ser la causa principal del problema de fons blanc */
  background-color: transparent !important; 
}
</style>

