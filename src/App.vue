<template>
  <div id="app">
    <div class="container">
      <h1>WebSocket Chat</h1>
      
      <div class="status" :class="statusClass">
        {{ connectionStatus }}
      </div>

      <div class="messages-container">
        <div 
          v-for="(msg, index) in messages" 
          :key="index" 
          class="message"
          :class="msg.type"
        >
          <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
          <span class="content">{{ msg.message }}</span>
        </div>
      </div>

      <div class="input-container">
        <input 
          v-model="newMessage" 
          @keyup.enter="sendMessage"
          placeholder="Type a message..."
          :disabled="!connected"
        />
        <button @click="sendMessage" :disabled="!connected || !newMessage.trim()">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      ws: null,
      connected: false,
      messages: [],
      newMessage: ''
    };
  },
  computed: {
    connectionStatus() {
      return this.connected ? 'Connected' : 'Disconnected';
    },
    statusClass() {
      return this.connected ? 'connected' : 'disconnected';
    }
  },
  methods: {
    connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messages.push(data);
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          this.connectWebSocket();
        }, 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    sendMessage() {
      if (this.newMessage.trim() && this.connected) {
        this.ws.send(JSON.stringify({
          message: this.newMessage
        }));
        this.newMessage = '';
      }
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    },
    scrollToBottom() {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  },
  mounted() {
    this.connectWebSocket();
  },
  beforeUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#app {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

h1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
  font-size: 24px;
}

.status {
  padding: 10px 20px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
}

.status.connected {
  background-color: #10b981;
  color: white;
}

.status.disconnected {
  background-color: #ef4444;
  color: white;
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  background-color: #f9fafb;
}

.message {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message.system {
  background-color: #e0e7ff;
  font-style: italic;
}

.message .timestamp {
  font-size: 12px;
  color: #6b7280;
  margin-right: 8px;
}

.message .content {
  color: #1f2937;
}

.input-container {
  display: flex;
  padding: 20px;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.input-container input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.input-container input:focus {
  border-color: #667eea;
}

.input-container input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.input-container button {
  margin-left: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.input-container button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.input-container button:active:not(:disabled) {
  transform: translateY(0);
}

.input-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
