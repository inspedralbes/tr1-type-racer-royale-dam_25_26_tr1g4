<template>
  <v-app-bar class="minimal-nav" dark flat height="58">
    <v-toolbar-title
      class="text-h5 nav-title font-weight-light"
      @click="router.push({ name: 'lobby' })"
      style="cursor: pointer"
    >
      <v-icon left color="#ffffff">mdi-run-fast</v-icon>
      Fit<span class="font-weight-bold ml-1">AI</span>
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <v-menu offset-y>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" icon>
          <v-avatar color="#4A148C 100%">
            <span class="white--text text-h5">{{ userInitial }}</span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list>
        <v-list-item :to="{ name: 'profile' }">
          <v-list-item-title>Mi Perfil</v-list-item-title>
        </v-list-item>
        <v-list-item @click="logout">
          <v-list-item-title>Cerrar Sesión</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useWebSocketStore } from "@/stores/websocket";

const router = useRouter();
const wsStore = useWebSocketStore();

const username = computed(() => localStorage.getItem("username") || "");
const userInitial = computed(() =>
  username.value ? username.value[0].toUpperCase() : ""
);

const logout = () => {
  // Clear user data
  localStorage.removeItem("fithub-token");
  localStorage.removeItem("username");

  // Disconnect WebSocket
  wsStore.disconnect();

  // Redirect to login
  router.push({ path: "/" });
};
</script>

<style scoped>
.minimal-nav {
  background-color: rgba(0, 0, 0, 0.95) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  /* Aseguramos que la barra esté por encima del contenido */
  z-index: 1000;
  position: fixed;
}

.nav-title {
  font-family: "Inter", sans-serif;
  letter-spacing: 1.5px;
  font-weight: 300 !important;
  color: #ffffff !important;
}

.nav-title .font-weight-bold {
  color: rgba(241, 255, 248, 1);
}
.v-btn {
  margin-right: 16px;
}
</style>
