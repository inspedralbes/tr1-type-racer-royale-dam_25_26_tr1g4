<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Variables d'estat
const email = ref("");
const password = ref("");
const username = ref("");
const isRegistering = ref(false);
const loading = ref(false);
const errorMessage = ref("");

// URL Base del teu backend (ajusta el port si cal)
const API_BASE_URL = "http://localhost:3000/api/users";

async function handleFetch(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const responseData = await response.json();
  if (!response.ok) {
    const errorMsg =
      responseData.message ||
      `Error del servidor amb l'estat ${response.status}`;
    throw new Error(errorMsg);
  }

  return responseData;
}

async function handleLogin() {
  errorMessage.value = "";
  loading.value = true;

  try {
    const dataToSend = {
      email: email.value,
      password: password.value,
    };

    const data = await handleFetch("/login", dataToSend);

    // 1. Desem el token i dades de l'usuari
    const { token, username: userFromApi } = data;
    localStorage.setItem("fithub-token", token);
    localStorage.setItem("username", userFromApi); // <-- AFEGIT: Guardem el nom d'usuari
    console.log(`Benvingut, ${userFromApi}!`);

    // 2. Navegació
    const salaId = "SALA_DEMO_FIT2024";
    router.push({ name: "lobby" });
  } catch (error) {
    // 3. Gestió d'errors (el missatge ja ve del 'throw new Error' de handleFetch)
    errorMessage.value = error.message || "Error de connexió a la xarxa.";
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  errorMessage.value = "";
  loading.value = true;

  try {
    const dataToSend = {
      username: username.value,
      email: email.value,
      password: password.value,
    };

    const data = await handleFetch("/register", dataToSend);

    // Registre completat. Mostrem un missatge i canviem a la vista de login.
    console.log(`Registre completat per a l'usuari: ${username.value}`);

    // Canviem al formulari de login
    isRegistering.value = false;
    // Opcional: Podries afegir un missatge de 'success' per a l'usuari.
  } catch (error) {
    // Gestió d'errors
    errorMessage.value = error.message || "Error de connexió a la xarxa.";
  } finally {
    loading.value = false;
  }
}

function handleSubmit() {
  if (isRegistering.value) {
    handleRegister();
  } else {
    handleLogin();
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12 pa-4">
          <v-card-title class="text-h5 text-center mb-4">
            FitHub - {{ isRegistering ? "Registre" : "Accés" }}
          </v-card-title>   

          <v-card-text>
            <v-alert v-if="errorMessage" type="error" class="mb-4">
              {{ errorMessage }}
            </v-alert>

            <v-form @submit.prevent="handleSubmit">
              <v-text-field
                v-if="isRegistering"
                v-model="username"
                label="Nom d'Usuari"
                prepend-icon="mdi-badge-account"
                type="text"
                required
                :disabled="loading"
              ></v-text-field>

              <v-text-field
                v-model="email"
                label="Correu Electrònic"
                prepend-icon="mdi-account"
                type="email"
                required
                :disabled="loading"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contrasenya"
                prepend-icon="mdi-lock"
                type="password"
                required
                :disabled="loading"
              ></v-text-field>

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-4"
                type="submit"
                :loading="loading"
                :disabled="loading"
              >
                {{ isRegistering ? "Registrar-se" : "Entrar" }}
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center">
            <v-btn
              variant="text"
              size="small"
              :disabled="loading"
              @click="isRegistering = !isRegistering"
            >
              {{
                isRegistering
                  ? "Ja tens compte? Fes Login"
                  : "No tens compte? Registra’t"
              }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
