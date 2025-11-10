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
      label="Escribe un mensaje..."
      dense
      outlined
      hide-details
      class="mt-2 chat-input"
      append-inner-icon="mdi-send"
      @click:append-inner="sendMessage"
    ></v-text-field>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

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

const emit = defineEmits(['send-message']);

const newMessage = ref('');
const messagesContainer = ref(null);

const sendMessage = () => {
  console.log('Chat.vue: sendMessage triggered');
  if (newMessage.value.trim()) {
    console.log('Chat.vue: Emitting send-message event with:', newMessage.value);
    emit('send-message', newMessage.value);
    newMessage.value = '';
  }
};

watch(
  () => props.messages,
  async (newMessages) => {
    console.log('Chat.vue: Messages prop updated:', newMessages);
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
  display: flex;
  flex-direction: column;
  height: 300px;
  border-radius: 8px;
  background-color: rgba(245, 245, 245, 0.8); /* Light grey background with some transparency */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 15px;
  color: #333; /* Dark text color */
}

.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 10px;
  background-color: rgba(255, 255, 255, 0.8); /* White background for messages with some transparency */
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for Webkit browsers */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}

.message {
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background-color: #e9e9e9; /* Slightly darker background for individual messages */
  word-wrap: break-word;
  max-width: 80%;
  align-self: flex-start;
  border: 1px solid #ddd;
}

.message.my-message {
  background-color: #dcf8c6; /* WhatsApp-like green for own messages */
}

.message:last-child {
  margin-bottom: 0;
}

.font-weight-bold {
  color: #1976D2; /* Vuetify's default primary blue color */
}

.chat-input {
  background-color: #fff;
  border-radius: 5px;
}

/* Adjust Vuetify's input specific styles for light theme */
.v-text-field--outlined fieldset {
  border-color: #ccc !important;
}

.v-text-field .v-input__control .v-input__slot {
  background-color: #fff !important;
}

.v-text-field label.v-label {
  color: #757575 !important;
}

.v-text-field input {
  color: #333 !important;
}

.v-text-field .v-input__append-inner .v-icon {
  color: #1976D2 !important;
}
</style>
