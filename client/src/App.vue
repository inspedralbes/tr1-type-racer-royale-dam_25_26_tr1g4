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
}

#app, .v-application {
  min-height: 100vh !important; 
  height: 100%; 
  
  background: #121212; 
  background: linear-gradient(
    135deg, 
    rgba(25, 6, 46, 1) 0%,      
    #000000ff 70%,      
    rgba(62, 19, 63, 1) 100%     
  ) !important; 
  background-attachment: fixed;
}


</style>
