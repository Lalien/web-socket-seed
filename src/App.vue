<template>
  <div id="app">
    <!-- Dice Roll Modal -->
    <div v-if="showDiceModal" class="modal-overlay">
      <div class="modal-content dice-modal" @click.stop>
        <h2 v-if="diceState === 'rolling'">🎲 Rolling Dice 🎲</h2>
        <h2 v-else-if="diceState === 'tie'">It's a Tie!</h2>
        <h2 v-else-if="diceState === 'result'">{{ diceResultTitle }}</h2>
        
        <div v-if="diceState === 'rolling' || diceState === 'tie'" class="dice-container">
          <div class="dice-wrapper">
            <div class="dice-label">You</div>
            <div class="dice" :class="{ rolling: isRolling }">
              <div class="dice-face">{{ myDiceRoll }}</div>
            </div>
          </div>
          <div class="dice-wrapper">
            <div class="dice-label">Opponent</div>
            <div class="dice" :class="{ rolling: isRolling }">
              <div class="dice-face">{{ opponentDiceRoll }}</div>
            </div>
          </div>
        </div>
        
        <p v-if="diceState === 'tie'" class="dice-message">
          Both rolled {{ myDiceRoll }}! Rolling again...
        </p>
        
        <p v-if="diceState === 'result'" class="dice-message">
          {{ diceResultMessage }}
        </p>
      </div>
    </div>

    <!-- Color Selection Modal -->
    <div v-if="showColorSelection" class="modal-overlay">
      <div class="modal-content color-selection-modal" @click.stop>
        <h2>Choose Your Color</h2>
        <p>You won the dice roll! Select your color:</p>
        <div class="color-selection-buttons">
          <button @click="selectColor('red')" class="color-button red-button">
            🔴 Red
          </button>
          <button @click="selectColor('blue')" class="color-button blue-button">
            🔵 Blue
          </button>
        </div>
      </div>
    </div>

    <!-- Waiting for Color Selection Modal -->
    <div v-if="showWaitingForColor" class="modal-overlay">
      <div class="modal-content" @click.stop>
        <h2>Waiting for Winner...</h2>
        <p>The winner is choosing their color. You'll be assigned the remaining color.</p>
        <div class="loading-spinner"></div>
      </div>
    </div>

    <!-- Turn Dice Roll Modal -->
    <div v-if="showTurnDiceModal" class="modal-overlay">
      <div class="modal-content dice-modal" @click.stop>
        <h2 v-if="turnDiceState === 'rolling'">🎲 Rolling for First Turn 🎲</h2>
        <h2 v-else-if="turnDiceState === 'tie'">It's a Tie!</h2>
        <h2 v-else-if="turnDiceState === 'result'">{{ turnDiceResultTitle }}</h2>
        
        <div v-if="turnDiceState === 'rolling' || turnDiceState === 'tie'" class="dice-container">
          <div class="dice-wrapper">
            <div class="dice-label">You</div>
            <div class="dice" :class="{ rolling: isTurnDiceRolling }">
              <div class="dice-face">{{ myTurnDiceRoll }}</div>
            </div>
          </div>
          <div class="dice-wrapper">
            <div class="dice-label">Opponent</div>
            <div class="dice" :class="{ rolling: isTurnDiceRolling }">
              <div class="dice-face">{{ opponentTurnDiceRoll }}</div>
            </div>
          </div>
        </div>
        
        <p v-if="turnDiceState === 'tie'" class="dice-message">
          Both rolled {{ myTurnDiceRoll }}! Rolling again...
        </p>
        
        <p v-if="turnDiceState === 'result'" class="dice-message">
          {{ turnDiceResultMessage }}
        </p>
      </div>
    </div>

    <!-- Turn Indicator Modal with Penguin -->
    <div v-if="showTurnModal" class="modal-overlay" @click="closeTurnModal">
      <div class="modal-content turn-modal" @click.stop>
        <div class="penguin-emoji">🐧</div>
        <h2>Your Turn!</h2>
        <p>It's your turn to play! Make your move.</p>
        <button @click="closeTurnModal" class="modal-button penguin-button">Let's Go!</button>
      </div>
    </div>

    <!-- Modal for game notifications -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2>{{ modalTitle }}</h2>
        <p>{{ modalMessage }}</p>
        <button @click="closeModal" class="modal-button">OK</button>
      </div>
    </div>

    <div class="container">
      <div class="header-bar">
        <h1>Interactive Grid Board</h1>
        <div class="user-info">
          <span class="welcome-text">👋 {{ currentUser?.displayName || 'User' }}</span>
          <button @click="logout" class="logout-button">Logout</button>
        </div>
      </div>
      
      <div class="status" :class="statusClass">
        {{ connectionStatus }}
      </div>

      <div class="user-counter">
        <span class="counter-label">Connected Users:</span>
        <span class="counter-value">{{ userCount }}</span>
      </div>

      <!-- Lobby Browser (shown when not in a lobby) -->
      <div v-if="!inLobby" class="lobby-browser">
        <div class="lobby-section">
          <h2>Create a Lobby</h2>
          <div class="lobby-create-form">
            <input 
              v-model="newLobbyName" 
              @keyup.enter="createLobby"
              placeholder="Enter lobby name..."
              class="lobby-input"
              :disabled="!connected"
              maxlength="50"
            />
            <button 
              @click="createLobby" 
              class="lobby-button create-button"
              :disabled="!connected || !newLobbyName.trim()"
            >
              Create & Join
            </button>
          </div>
        </div>

        <div class="lobby-section">
          <h2>Available Lobbies</h2>
          <div v-if="availableLobbies.length === 0" class="lobby-empty">
            No lobbies available. Create one to get started!
          </div>
          <div v-else class="lobby-list">
            <div 
              v-for="lobby in availableLobbies" 
              :key="lobby.name" 
              class="lobby-item"
            >
              <div class="lobby-info">
                <span class="lobby-name">{{ lobby.name }}</span>
                <span class="lobby-players">
                  {{ lobby.playerCount }}/{{ lobby.maxPlayers }} players
                </span>
              </div>
              <button 
                @click="joinLobby(lobby.name)" 
                class="lobby-button join-button"
                :disabled="!connected || lobby.playerCount >= lobby.maxPlayers"
              >
                {{ lobby.playerCount >= lobby.maxPlayers ? 'Full' : 'Join' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Game UI (shown when in a lobby) -->
      <div v-else class="game-container">
        <div class="lobby-header">
          <div class="lobby-info-bar">
            <span class="current-lobby-name">
              📍 Lobby: <strong>{{ currentLobby }}</strong>
            </span>
            <button @click="leaveLobby" class="lobby-button leave-button">
              Leave Lobby
            </button>
          </div>
        </div>

        <!-- Player Info -->
        <div v-if="playerAssignmentReceived" class="player-info">
          <div v-if="playerColor" class="player-badge" :class="playerColor">
            You are the <strong>{{ playerColor.toUpperCase() }}</strong> player
          </div>
          <div v-else class="player-badge waiting">
            Waiting for game to start...
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
      playerIndex: null,
      gameStatus: 'waiting',
      showModal: false,
      modalTitle: '',
      modalMessage: '',
      chatMessages: [],
      chatInput: '',
      // Dice roll state
      showDiceModal: false,
      diceState: 'rolling', // rolling, tie, result
      myDiceRoll: 1,
      opponentDiceRoll: 1,
      isRolling: false,
      isWinner: false,
      // Turn dice roll state
      showTurnDiceModal: false,
      turnDiceState: 'rolling', // rolling, tie, result
      myTurnDiceRoll: 1,
      opponentTurnDiceRoll: 1,
      isTurnDiceRolling: false,
      isFirstPlayer: false,
      // Turn indicator state
      showTurnModal: false,
      currentTurn: null, // Player index whose turn it is
      // Color selection state
      showColorSelection: false,
      showWaitingForColor: false,
      // Lobby state
      currentLobby: null,
      availableLobbies: [],
      newLobbyName: '',
      // User state
      currentUser: null
    };
  },
  computed: {
    connectionStatus() {
      return this.connected ? 'Connected' : 'Disconnected';
    },
    statusClass() {
      return this.connected ? 'connected' : 'disconnected';
    },
    inLobby() {
      return this.currentLobby !== null;
    },
    isBoardLocked() {
      return !this.connected || !this.isActivePlayer || this.gameStatus !== 'active' || this.currentTurn !== this.playerIndex;
    },
    gameStatusMessage() {
      if (this.gameStatus === 'waiting') {
        return 'Waiting for players...';
      } else if (this.gameStatus === 'active') {
        if (this.currentTurn === null) {
          return 'Game Active - Play!';
        } else if (this.currentTurn === this.playerIndex) {
          return '🐧 Your Turn! 🐧';
        } else {
          return 'Opponent\'s Turn - Please Wait';
        }
      }
      return '';
    },
    gameStatusClass() {
      return {
        'status-waiting': this.gameStatus === 'waiting',
        'status-active': this.gameStatus === 'active'
      };
    },
    diceResultTitle() {
      return this.isWinner ? '🎉 You Won! 🎉' : 'You Lost';
    },
    diceResultMessage() {
      if (this.isWinner) {
        return `You rolled ${this.myDiceRoll} and your opponent rolled ${this.opponentDiceRoll}. Choose your color!`;
      } else {
        return `You rolled ${this.myDiceRoll} and your opponent rolled ${this.opponentDiceRoll}. Waiting for winner to choose...`;
      }
    },
    turnDiceResultTitle() {
      return this.isFirstPlayer ? '🎉 You Go First! 🎉' : 'Opponent Goes First';
    },
    turnDiceResultMessage() {
      if (this.isFirstPlayer) {
        return `You rolled ${this.myTurnDiceRoll} and your opponent rolled ${this.opponentTurnDiceRoll}. You get the first turn!`;
      } else {
        return `You rolled ${this.myTurnDiceRoll} and your opponent rolled ${this.opponentTurnDiceRoll}. Your opponent goes first.`;
      }
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
            this.playerIndex = data.playerIndex;
            this.playerAssignmentReceived = true;
          } else if (data.type === 'gameStatus') {
            // Update game status
            this.gameStatus = data.status;
          } else if (data.type === 'diceRollStart') {
            // Start dice roll animation
            this.handleDiceRollStart(data);
          } else if (data.type === 'diceRollTie') {
            // Handle tie
            this.handleDiceRollTie(data);
          } else if (data.type === 'diceRollWinner') {
            // Show result
            this.handleDiceRollWinner(data);
          } else if (data.type === 'colorAssigned') {
            // Color has been assigned
            this.playerColor = data.color;
            this.isActivePlayer = data.isActivePlayer;
            this.showDiceModal = false;
            this.showColorSelection = false;
            this.showWaitingForColor = false;
          } else if (data.type === 'turnDiceRollStart') {
            // Start turn determination dice roll animation
            this.handleTurnDiceRollStart(data);
          } else if (data.type === 'turnDiceRollTie') {
            // Handle turn dice roll tie
            this.handleTurnDiceRollTie(data);
          } else if (data.type === 'turnDiceRollWinner') {
            // Show turn determination result
            this.handleTurnDiceRollWinner(data);
          } else if (data.type === 'turnChanged') {
            // Update current turn
            this.handleTurnChanged(data);
          } else if (data.type === 'gameStart') {
            // Show welcome modal when game starts
            this.showWelcomeModal(data.yourColor);
          } else if (data.type === 'playerDisconnected') {
            // Handle player disconnection
            this.showDiceModal = false;
            this.showColorSelection = false;
            this.showWaitingForColor = false;
            this.showTurnDiceModal = false;
            this.showTurnModal = false;
            this.playerColor = null;
            this.currentTurn = null;
            this.modalTitle = 'Player Disconnected';
            this.modalMessage = data.message;
            this.showModal = true;
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
          } else if (data.type === 'lobbyList') {
            // Update available lobbies
            this.availableLobbies = data.lobbies;
          } else if (data.type === 'lobbyJoined') {
            // Successfully joined a lobby
            this.currentLobby = data.lobbyName;
            this.chatMessages = []; // Clear chat when joining new lobby
          } else if (data.type === 'lobbyLeft') {
            // Successfully left a lobby
            this.currentLobby = null;
            this.playerColor = null;
            this.isActivePlayer = false;
            this.playerAssignmentReceived = false;
            this.playerIndex = null;
            this.gameStatus = 'waiting';
            this.currentTurn = null;
            this.showTurnModal = false;
            this.chatMessages = [];
            this.grid = Array(10).fill(null).map(() => Array(10).fill('lime'));
          } else if (data.type === 'error') {
            // Handle error messages
            this.modalTitle = 'Error';
            this.modalMessage = data.message;
            this.showModal = true;
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
    },
    handleDiceRollStart(data) {
      this.showDiceModal = true;
      this.diceState = 'rolling';
      this.isRolling = true;
      
      // Set initial roll values (will animate)
      this.myDiceRoll = 1;
      this.opponentDiceRoll = 1;
      
      // Animate dice rolling
      let rollCount = 0;
      const rollInterval = setInterval(() => {
        this.myDiceRoll = Math.floor(Math.random() * 6) + 1;
        this.opponentDiceRoll = Math.floor(Math.random() * 6) + 1;
        rollCount++;
        
        // Stop after about 2.5 seconds and show actual result
        if (rollCount > 15) {
          clearInterval(rollInterval);
          this.isRolling = false;
          // Set the actual roll from server
          if (data.playerIndex === this.playerIndex) {
            this.myDiceRoll = data.roll;
          }
          // We'll get opponent's roll from the diceRollWinner message
        }
      }, 150);
    },
    handleDiceRollTie(data) {
      this.diceState = 'tie';
      this.isRolling = false;
      // After delay, it will restart automatically from server
    },
    handleDiceRollWinner(data) {
      this.isWinner = data.isWinner;
      
      // Set final dice values
      // Get both rolls from the game state
      // The server sends us if we're winner, we need to figure out rolls
      // For now, keep the animated values, they're close enough
      
      this.diceState = 'result';
      this.isRolling = false;
      
      // After showing result for 2 seconds
      setTimeout(() => {
        if (this.isWinner) {
          this.showDiceModal = false;
          this.showColorSelection = true;
        } else {
          this.showDiceModal = false;
          this.showWaitingForColor = true;
        }
      }, 2000);
    },
    selectColor(color) {
      // Send color selection to server
      this.ws.send(JSON.stringify({
        type: 'selectColor',
        color: color
      }));
      
      this.showColorSelection = false;
    },
    handleTurnDiceRollStart(data) {
      this.showTurnDiceModal = true;
      this.turnDiceState = 'rolling';
      this.isTurnDiceRolling = true;
      
      // Set initial roll values (will animate)
      this.myTurnDiceRoll = 1;
      this.opponentTurnDiceRoll = 1;
      
      // Animate dice rolling
      let rollCount = 0;
      const rollInterval = setInterval(() => {
        this.myTurnDiceRoll = Math.floor(Math.random() * 6) + 1;
        this.opponentTurnDiceRoll = Math.floor(Math.random() * 6) + 1;
        rollCount++;
        
        // Stop after about 2.5 seconds and show actual result
        if (rollCount > 15) {
          clearInterval(rollInterval);
          this.isTurnDiceRolling = false;
          // Set the actual roll from server
          if (data.playerIndex === this.playerIndex) {
            this.myTurnDiceRoll = data.roll;
          }
          // We'll get opponent's roll from the turnDiceRollWinner message
        }
      }, 150);
    },
    handleTurnDiceRollTie(data) {
      this.turnDiceState = 'tie';
      this.isTurnDiceRolling = false;
      // After delay, it will restart automatically from server
    },
    handleTurnDiceRollWinner(data) {
      this.isFirstPlayer = data.isFirst;
      this.currentTurn = data.firstPlayerIndex;
      
      // Set the actual dice roll values from server
      if (data.playerIndex === 0) {
        this.myTurnDiceRoll = data.roll1;
        this.opponentTurnDiceRoll = data.roll2;
      } else {
        this.myTurnDiceRoll = data.roll2;
        this.opponentTurnDiceRoll = data.roll1;
      }
      
      this.turnDiceState = 'result';
      this.isTurnDiceRolling = false;
      
      // After showing result for 2 seconds, close the modal and show turn modal if first
      setTimeout(() => {
        this.showTurnDiceModal = false;
        if (this.isFirstPlayer) {
          this.showTurnModal = true;
        }
      }, 2000);
    },
    handleTurnChanged(data) {
      this.currentTurn = data.currentTurn;
      
      // Show turn modal if it's your turn
      if (data.isYourTurn) {
        this.showTurnModal = true;
      }
    },
    closeTurnModal() {
      this.showTurnModal = false;
    },
    createLobby() {
      if (!this.connected || !this.newLobbyName.trim()) {
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: 'createLobby',
        lobbyName: this.newLobbyName.trim()
      }));
      
      this.newLobbyName = '';
    },
    joinLobby(lobbyName) {
      if (!this.connected) {
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: 'joinLobby',
        lobbyName: lobbyName
      }));
    },
    leaveLobby() {
      if (!this.connected || !this.currentLobby) {
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: 'leaveLobby'
      }));
    },
    requestLobbyList() {
      if (!this.connected) {
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: 'getLobbyList'
      }));
    },
    logout() {
      window.location.href = '/auth/logout';
    },
    async fetchCurrentUser() {
      try {
        const response = await fetch('/auth/user');
        if (response.ok) {
          const data = await response.json();
          this.currentUser = data.user;
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        window.location.href = '/login';
      }
    }
  },
  mounted() {
    this.fetchCurrentUser();
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

.header-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.welcome-text {
  font-size: 14px;
  font-weight: 500;
}

.logout-button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.logout-button:active {
  transform: translateY(0);
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

.player-badge.connecting {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 2px solid #d1d5db;
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

/* Dice Roll Modal Styles */
.dice-modal {
  min-width: 500px;
  padding: 40px;
}

.dice-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 30px 0;
  gap: 40px;
}

.dice-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.dice-label {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}

.dice {
  width: 100px;
  height: 100px;
  background: white;
  border: 3px solid #667eea;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.dice.rolling {
  animation: roll 0.15s infinite;
}

@keyframes roll {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(5deg) scale(1.05);
  }
  75% {
    transform: rotate(-5deg) scale(0.95);
  }
}

.dice-face {
  font-size: 48px;
  font-weight: bold;
  color: #667eea;
}

.dice-message {
  font-size: 18px;
  color: #374151;
  margin-top: 20px;
  line-height: 1.6;
}

/* Color Selection Modal Styles */
.color-selection-modal {
  min-width: 400px;
  padding: 40px;
}

.color-selection-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
}

.color-button {
  padding: 20px 40px;
  font-size: 20px;
  font-weight: 600;
  border: 3px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.red-button {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #b91c1c;
}

.red-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.4);
}

.blue-button {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #1d4ed8;
}

.blue-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4);
}

.color-button:active {
  transform: translateY(0);
}

/* Loading Spinner */
.loading-spinner {
  margin: 30px auto;
  width: 50px;
  height: 50px;
  border: 5px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Turn Modal Styles */
.turn-modal {
  min-width: 400px;
  padding: 40px;
  animation: bounceIn 0.5s ease;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.penguin-emoji {
  font-size: 80px;
  margin-bottom: 20px;
  animation: wiggle 1s ease-in-out infinite;
}

@keyframes wiggle {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
}

.penguin-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  font-size: 18px;
  padding: 15px 40px;
}

.penguin-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* Lobby Browser Styles */
.lobby-browser {
  padding: 20px;
  background-color: #f9fafb;
}

.lobby-section {
  margin-bottom: 30px;
}

.lobby-section h2 {
  color: #374151;
  margin-bottom: 15px;
  font-size: 20px;
}

.lobby-create-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.lobby-input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.lobby-input:focus {
  outline: none;
  border-color: #667eea;
}

.lobby-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.lobby-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.create-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.create-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.create-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lobby-empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 40px 20px;
  background-color: white;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
}

.lobby-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lobby-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: white;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: border-color 0.2s;
}

.lobby-item:hover {
  border-color: #667eea;
}

.lobby-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lobby-name {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.lobby-players {
  font-size: 14px;
  color: #6b7280;
}

.join-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.join-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.join-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Lobby Header Styles */
.lobby-header {
  padding: 15px 20px;
  background-color: #f0f4ff;
  border-bottom: 2px solid #e0e7ff;
}

.lobby-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-lobby-name {
  font-size: 18px;
  color: #374151;
}

.leave-button {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.leave-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.player-badge.waiting {
  background-color: #fef3c7;
  color: #92400e;
  border: 2px solid #fbbf24;
}

.game-container {
  /* Container for in-lobby game UI */
}
</style>
