<template>
  <div class="chat-container">
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="{ 'my-message': msg.username === username }"
      >
        <span class="font-weight-bold">{{ msg.username }}:</span> {{ msg.text }}
      </div>
    </div>
    <v-text-field
      v-model="newMessage"
      @keyup.enter="sendMessage"
      density="compact"
      outlined
      hide-details
      class="mt-2 chat-input"
      append-inner-icon="mdi-send"
      @click:append-inner="sendMessage"
    ></v-text-field>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  username: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["send-message"]);

const newMessage = ref("");
const messagesContainer = ref(null);

const sendMessage = () => {
  console.log("Chat.vue: sendMessage triggered");
  if (newMessage.value.trim()) {
    console.log(
      "Chat.vue: Emitting send-message event with:",
      newMessage.value
    );
    emit("send-message", newMessage.value);
    newMessage.value = "";
  }
};

watch(
  () => props.messages,
  async (newMessages) => {
    console.log("Chat.vue: Messages prop updated:", newMessages);
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  },
  { deep: true }
);
</script>

<style scoped>
.chat-container {
  background: rgba(17, 17, 17, 0.4); /* Fons fosc semi-transparent */
  backdrop-filter: blur(10px); /* Efecte vidre glaçat */
  -webkit-backdrop-filter: blur(10px); /* Suport per a Safari */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);

  display: flex;
  flex-direction: column;
  height: 100%; 
  padding: 16px;
  padding-bottom: 60px; /* Added padding to the bottom */
  color: #f0f0f0;
}

.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 8px; 
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Barra de scroll personalitzada per a un look modern */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.message {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: rgba(40, 40, 40, 0.6); /* Fons de missatge subtil */
  word-wrap: break-word;
  max-width: 90%;
  align-self: flex-start;
  line-height: 1.4;
}

.message.my-message {
  background-color: rgba(0, 100, 200, 0.5); /* Blau per als missatges propis */
  align-self: flex-end;
}

.font-weight-bold {
  font-weight: 600;
  color: #00c8ff; /* Color cian per al nom d'usuari */
}

.my-message .font-weight-bold {
  color: #cceeff; /* Un blau més clar per al nom propi */
}

/* * ESTILOS MEJORADOS PARA EL CAMPO DE TEXTO DEL CHAT 
*/

.chat-input {
  margin-top: 0; /* Eliminado el margen superior para reducir el espacio entre el contenedor de mensajes y el input */
  --v-field-background: rgba(0, 0, 0, 0.2) !important;
  --v-field-color: #ffffff !important;
  --v-field-label-color: rgba(255, 255, 255, 0.6) !important;
  --v-field-border-color: rgba(255, 255, 255, 0.2) !important;
  --v-field-border-opacity: 1 !important;
  --v-field-border-width: 1px !important;
  transition: all 0.3s ease; /* Suaviza las transiciones */
}

/* Animación al enfocar el input */
.chat-input :deep(.v-field--focused) {
  --v-field-border-color: #00c8ff !important; /* Borde cian al enfocar */
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.5); /* Sombra luminosa */
}

/* Regla principal para forzar la altura */
.chat-input :deep(.v-field) {
  border-radius: 8px !important;
  min-height: 36px !important;
  height: 36px !important;
  transition: all 0.3s ease; /* Transición para cambios de estilo */
}

/* Ajusta el padding de l'input intern */
.chat-input :deep(.v-field__input) {
  padding-top: -1% !important; /* Redueix el padding superior */
  padding-bottom: 1% !important; /* Redueix el padding inferior */
  color: #ffffff !important; /* Color del texto cuando se escribe */
  caret-color: #ffffff !important; /* Color del cursor (blanco) */
}

/* Ajusta el padding de la label per centrar-la */
.chat-input :deep(.v-label.v-field-label) {
  margin-top: -3px !important;
  transition: all 0.3s ease; /* Transición para la label */
}

/* Opcional: Centrar l'icona amb la nova altura */
.chat-input :deep(.v-field__append-inner) {
  padding-top: 6px !important; /* Ajusta això si l'icona queda descentrada */
}

/* Arrodoniment de les cantonades del outline */
.chat-input :deep(.v-field__outline__start) {
  border-radius: 8px 8px 8px 8px !important;
}

/* Estils de l'icona d'enviar */
.chat-input :deep(.mdi-send) {
  color: #00c8ff !important;
  cursor: pointer;
  transition: transform 0.2s ease, margin-right 0.2s ease; /* Añadida transición para margin-right */
}

.chat-input :deep(.mdi-send:hover) {
  transform: scale(1.1);
  margin-right: -3px; /* Mueve el icono ligeramente a la derecha */
}
</style>
