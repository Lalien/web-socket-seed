<template>
  <div id="app">
    <!-- Modal for game notifications -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2>{{ modalTitle }}</h2>
        <p>{{ modalMessage }}</p>
        <button @click="closeModal" class="modal-button">OK</button>
      </div>
    </div>

    <div class="container">
      <h1>Interactive Grid Board</h1>
      
      <div class="status" :class="statusClass">
        {{ connectionStatus }}
      </div>

      <div class="user-counter">
        <span class="counter-label">Connected Users:</span>
        <span class="counter-value">{{ userCount }}</span>
      </div>

      <!-- Player Info -->
      <div v-if="playerAssignmentReceived" class="player-info">
        <div v-if="playerColor" class="player-badge" :class="playerColor">
          You are the <strong>{{ playerColor.toUpperCase() }}</strong> player
        </div>
        <div v-else class="player-badge spectator">
          You are a <strong>SPECTATOR</strong> - Game is full
        </div>
      </div>
      <div v-else class="player-info">
        <div class="player-badge" style="background-color: #f3f4f6; color: #6b7280; border: 2px solid #d1d5db;">
          Connecting...
        </div>
      </div>

      <!-- Game Status -->
      <div class="game-status" :class="gameStatusClass">
        {{ gameStatusMessage }}
      </div>

      <div class="grid-container">
        <div class="grid" :class="{ locked: isBoardLocked }">
          <div 
            v-for="(row, rowIndex) in grid" 
            :key="rowIndex" 
            class="grid-row"
          >
            <div
              v-for="(color, colIndex) in row"
              :key="colIndex"
              class="grid-square"
              :style="{ backgroundColor: getSquareColor(color) }"
              @click="toggleSquare(rowIndex, colIndex)"
              :class="{ 'locked-square': isBoardLocked }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Chat Section -->
      <div class="chat-section">
        <h3>Game Chat</h3>
        <div class="chat-messages" ref="chatMessages">
          <div 
            v-for="(msg, index) in chatMessages" 
            :key="index" 
            class="chat-message"
          >
            <span class="chat-sender">{{ msg.sender }}:</span>
            <span class="chat-text">{{ msg.message }}</span>
          </div>
          <div v-if="chatMessages.length === 0" class="chat-empty">
            No messages yet. Start chatting!
          </div>
        </div>
        <div class="chat-input-container">
          <input 
            v-model="chatInput" 
            @keyup.enter="sendChatMessage"
            placeholder="Type a message..."
            class="chat-input"
            :disabled="!connected"
          />
          <button 
            @click="sendChatMessage" 
            class="chat-send-button"
            :disabled="!connected || !chatInput.trim()"
          >
            Send
          </button>
        </div>
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
      grid: Array(10).fill(null).map(() => Array(10).fill('lime')),
      userCount: 0,
      playerColor: null,
      isActivePlayer: false,
      playerAssignmentReceived: false,
      gameStatus: 'waiting',
      showModal: false,
      modalTitle: '',
      modalMessage: '',
      chatMessages: [],
      chatInput: ''
    };
  },
  computed: {
    connectionStatus() {
      return this.connected ? 'Connected' : 'Disconnected';
    },
    statusClass() {
      return this.connected ? 'connected' : 'disconnected';
    },
    isBoardLocked() {
      return !this.connected || !this.isActivePlayer || this.gameStatus !== 'active';
    },
    gameStatusMessage() {
      if (this.gameStatus === 'waiting') {
        return 'Waiting for players...';
      } else if (this.gameStatus === 'active') {
        return 'Game Active - Play!';
      }
      return '';
    },
    gameStatusClass() {
      return {
        'status-waiting': this.gameStatus === 'waiting',
        'status-active': this.gameStatus === 'active'
      };
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
          
          if (data.type === 'initialState') {
            // Receive initial grid state from server
            this.grid = data.gridState;
          } else if (data.type === 'squareToggled') {
            // Update specific square
            this.grid[data.row][data.col] = data.color;
          } else if (data.type === 'userCount') {
            // Update user count
            this.userCount = data.count;
          } else if (data.type === 'playerAssignment') {
            // Receive player assignment
            this.playerColor = data.color;
            this.isActivePlayer = data.isActivePlayer;
            this.playerAssignmentReceived = true;
            
            // Show modal if game is full and user is not an active player
            if (!data.isActivePlayer) {
              this.showGameFullModal();
            }
          } else if (data.type === 'gameStatus') {
            // Update game status
            this.gameStatus = data.status;
          } else if (data.type === 'gameStart') {
            // Show welcome modal when game starts
            this.showWelcomeModal(data.yourColor);
          } else if (data.type === 'chatMessage') {
            // Add chat message
            this.chatMessages.push({
              sender: data.sender,
              message: data.message,
              timestamp: data.timestamp
            });
            // Auto-scroll to bottom
            this.$nextTick(() => {
              this.scrollChatToBottom();
            });
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.playerAssignmentReceived = false;
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          this.connectWebSocket();
        }, 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    toggleSquare(row, col) {
      if (this.isBoardLocked) {
        console.log('Board is locked');
        return;
      }
      
      if (this.connected) {
        this.ws.send(JSON.stringify({
          type: 'toggleSquare',
          row: row,
          col: col
        }));
      }
    },
    getSquareColor(color) {
      const colorMap = {
        'lime': '#32CD32',
        'red': '#FF0000',
        'blue': '#0000FF'
      };
      return colorMap[color] || '#32CD32';
    },
    showWelcomeModal(color) {
      this.modalTitle = 'Welcome to the game!';
      this.modalMessage = `You are the ${color.toUpperCase()} player. The game has started!`;
      this.showModal = true;
    },
    showGameFullModal() {
      this.modalTitle = 'Game is Full';
      this.modalMessage = 'The game already has 2 players. You can watch as a spectator.';
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    sendChatMessage() {
      if (!this.connected || !this.chatInput.trim()) {
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: 'chatMessage',
        message: this.chatInput.trim()
      }));
      
      this.chatInput = '';
    },
    scrollChatToBottom() {
      const chatContainer = this.$refs.chatMessages;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
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
  max-width: 900px;
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

.user-counter {
  padding: 15px 20px;
  text-align: center;
  background-color: #f0f4ff;
  border-bottom: 2px solid #e0e7ff;
}

.counter-label {
  font-size: 16px;
  color: #4b5563;
  margin-right: 10px;
  font-weight: 500;
}

.counter-value {
  font-size: 24px;
  color: #667eea;
  font-weight: 700;
}

/* Player Info Styles */
.player-info {
  padding: 15px 20px;
  text-align: center;
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.player-badge {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.player-badge.red {
  background-color: #fee2e2;
  color: #991b1b;
  border: 2px solid #ef4444;
}

.player-badge.blue {
  background-color: #dbeafe;
  color: #1e3a8a;
  border: 2px solid #3b82f6;
}

.player-badge.spectator {
  background-color: #f3f4f6;
  color: #4b5563;
  border: 2px solid #9ca3af;
}

/* Game Status Styles */
.game-status {
  padding: 12px 20px;
  text-align: center;
  font-weight: 600;
  font-size: 16px;
}

.game-status.status-waiting {
  background-color: #fef3c7;
  color: #92400e;
}

.game-status.status-active {
  background-color: #d1fae5;
  color: #065f46;
}

.grid-container {
  padding: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9fafb;
}

.grid {
  display: inline-block;
  border: 3px solid #374151;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.grid.locked {
  opacity: 0.6;
  pointer-events: none;
}

.grid-row {
  display: flex;
}

.grid-square {
  width: 50px;
  height: 50px;
  border: 1px solid #374151;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.grid-square:hover {
  transform: scale(0.95);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
}

.grid-square:active {
  transform: scale(0.9);
}

.grid-square.locked-square {
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  text-align: center;
}

.modal-content h2 {
  color: #374151;
  margin-bottom: 15px;
  font-size: 24px;
}

.modal-content p {
  color: #6b7280;
  margin-bottom: 20px;
  font-size: 16px;
  line-height: 1.5;
}

.modal-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.modal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.modal-button:active {
  transform: translateY(0);
}

/* Chat Styles */
.chat-section {
  border-top: 2px solid #e5e7eb;
  background-color: #f9fafb;
  padding: 20px;
}

.chat-section h3 {
  color: #374151;
  margin-bottom: 15px;
  font-size: 18px;
}

.chat-messages {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  height: 200px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.chat-message {
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f3f4f6;
  border-radius: 6px;
}

.chat-sender {
  font-weight: 600;
  color: #667eea;
  margin-right: 8px;
}

.chat-text {
  color: #374151;
}

.chat-empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 20px;
}

.chat-input-container {
  display: flex;
  gap: 10px;
}

.chat-input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.chat-input:focus {
  outline: none;
  border-color: #667eea;
}

.chat-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.chat-send-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.chat-send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.chat-send-button:active:not(:disabled) {
  transform: translateY(0);
}

.chat-send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
