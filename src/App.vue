<template>
  <div id="app">
    <div class="container">
      <h1>Interactive Grid Board</h1>
      
      <div class="status" :class="statusClass">
        {{ connectionStatus }}
      </div>

      <div class="user-counter">
        <span class="counter-label">Connected Users:</span>
        <span class="counter-value">{{ userCount }}</span>
      </div>

      <div class="grid-container">
        <div class="grid">
          <div 
            v-for="(row, rowIndex) in grid" 
            :key="rowIndex" 
            class="grid-row"
          >
            <div
              v-for="(color, colIndex) in row"
              :key="colIndex"
              class="grid-square"
              :style="{ backgroundColor: color === 'lime' ? '#32CD32' : '#FF0000' }"
              @click="toggleSquare(rowIndex, colIndex)"
            ></div>
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
      userCount: 0
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
          
          if (data.type === 'initialState') {
            // Receive initial grid state from server
            this.grid = data.gridState;
          } else if (data.type === 'squareToggled') {
            // Update specific square
            this.grid[data.row][data.col] = data.color;
          } else if (data.type === 'userCount') {
            // Update user count
            this.userCount = data.count;
          }
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
    toggleSquare(row, col) {
      if (this.connected) {
        this.ws.send(JSON.stringify({
          type: 'toggleSquare',
          row: row,
          col: col
        }));
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
</style>
