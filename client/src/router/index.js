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
      path: "/sala/:id/:exercise",
      name: "sala",
      component: PoseDetector,
      props: route => ({ 
        sessionId: route.params.id, 
        exercise: route.params.exercise,
        userId: route.query.userId, 
        username: route.query.username 
      }),
      // Aquí podríem afegir lògica per requerir que l'usuari estigui autenticat
      meta: { requiresAuth: true }
    },
    {
      path: "/lobby",
      name: "lobby",
      component: LobbySalas,
      meta: { requiresAuth: true },
    },
    {
      path: "/room/:roomId",
      name: "room",
      component: RoomLobby,
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("@/pages/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

// --- Lògica del Workaround (Mantinguda) ---

// Workaround for https://github.com/vitejs/vite/issues/11804
// Guardia de Navegación
router.beforeEach((to, from, next) => {
  const loggedIn = localStorage.getItem('fithub-token');

  if (to.matched.some(record => record.meta.requiresAuth) && !loggedIn) {
    // Si la ruta requiere autenticación y el usuario no está logueado,
    // redirige a la página de login con un mensaje de error.
    next({ path: '/', query: { error: 'auth' } });
  } else {
    // Si no, permite la navegación.
    next();
  }
});


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
