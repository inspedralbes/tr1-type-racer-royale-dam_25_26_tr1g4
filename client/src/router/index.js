// src/router/index.js

import { createRouter, createWebHistory } from "vue-router";
import LoginView from "@/pages/LoginView.vue";
import PoseDetector from "@/pages/PoseDetector.vue";
import LobbySalas from "@/pages/LobbySalas.vue";
import RoomLobby from "@/pages/RoomLobby.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // RUTA DE LOGIN / LOBBY
      path: "/",
      name: "login", // O 'lobby' si va directament al lobby
      component: LoginView,
    },
    {
      // RUTA DE LA SALA DE VÍDEO / DETECTOR DE POSE
      // És una 'Page' i carregarà els Keypoints i PoseFeatures
      path: "/sala/:id",
      name: "sala",
      component: PoseDetector,
      props: route => ({ sessionId: route.params.id, userId: route.query.userId, username: route.query.username }),
      // Aquí podríem afegir lògica per requerir que l'usuari estigui autenticat
      // meta: { requiresAuth: true }
    },
    {
      path: "/lobby",
      name: "lobby",
      component: LobbySalas,
    },
    {
      path: "/room/:roomId",
      name: "room",
      component: RoomLobby,
    },
  ],
});

// --- Lògica del Workaround (Mantinguda) ---

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.("Failed to fetch dynamically imported module")) {
    if (localStorage.getItem("vuetify:dynamic-reload")) {
      console.error("Dynamic import error, reloading page did not fix it", err);
    } else {
      console.log("Reloading page to fix dynamic import error");
      localStorage.setItem("vuetify:dynamic-reload", "true");
      location.assign(to.fullPath);
    }
  } else {
    console.error(err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem("vuetify:dynamic-reload");
});

export default router;
