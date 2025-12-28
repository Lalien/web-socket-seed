const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Initialize grid state (10x10, all squares start as lime green)
const gridState = Array(10).fill(null).map(() => Array(10).fill('lime'));

// Track active players (max 2)
const activePlayers = [];
const MAX_PLAYERS = 2;

// Broadcast user count to all clients
function broadcastUserCount() {
  const count = wss.clients.size;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'userCount',
        count: count
      }));
    }
  });
}

// Broadcast game status to all clients
function broadcastGameStatus() {
  const playerCount = activePlayers.length;
  let status = 'waiting'; // waiting for players
  if (playerCount === MAX_PLAYERS) {
    status = 'active'; // game is active
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'gameStatus',
        status: status,
        playerCount: playerCount
      }));
    }
  });
}

// Broadcast chat message to all clients
function broadcastChatMessage(message, sender) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'chatMessage',
        message: message,
        sender: sender,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let playerColor = null;
  let isActivePlayer = false;

  // Assign player color if there's room
  if (activePlayers.length < MAX_PLAYERS) {
    isActivePlayer = true;
    playerColor = activePlayers.length === 0 ? 'red' : 'blue';
    activePlayers.push({ ws, color: playerColor });
    console.log(`Player assigned: ${playerColor.toUpperCase()}`);
  } else {
    console.log('Client connected as spectator (game is full)');
  }

  // Send initial state to the new client
  ws.send(JSON.stringify({
    type: 'initialState',
    gridState: gridState
  }));

  // Send player assignment
  ws.send(JSON.stringify({
    type: 'playerAssignment',
    color: playerColor,
    isActivePlayer: isActivePlayer
  }));

  // Broadcast updated user count to all clients
  broadcastUserCount();
  
  // Broadcast game status
  broadcastGameStatus();
  
  // If game just became active (2 players), send game start notification
  if (activePlayers.length === MAX_PLAYERS) {
    activePlayers.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: 'gameStart',
          message: 'Welcome to the game!',
          yourColor: player.color
        }));
      }
    });
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    try {
      const message = JSON.parse(data);
      
      // Handle grid toggle
      if (message.type === 'toggleSquare') {
        // Only allow active players to toggle squares
        if (!isActivePlayer) {
          console.log('Non-active player tried to toggle square');
          return;
        }
        
        const { row, col } = message;
        // Only allow players to place their assigned color
        // Toggle from lime to player's color, or from player's color back to lime
        if (gridState[row][col] === 'lime') {
          gridState[row][col] = playerColor;
        } else if (gridState[row][col] === playerColor) {
          gridState[row][col] = 'lime';
        } else {
          // Square is another player's color, don't allow toggle
          console.log(`Player ${playerColor} tried to toggle ${gridState[row][col]} square`);
          return;
        }
        
        // Broadcast the change to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'squareToggled',
              row: row,
              col: col,
              color: gridState[row][col]
            }));
          }
        });
      }
      
      // Handle chat messages
      if (message.type === 'chatMessage') {
        const sender = playerColor ? `${playerColor.charAt(0).toUpperCase() + playerColor.slice(1)} Player` : 'Spectator';
        broadcastChatMessage(message.message, sender);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Remove from active players if they were an active player
    const playerIndex = activePlayers.findIndex(p => p.ws === ws);
    if (playerIndex !== -1) {
      const disconnectedColor = activePlayers[playerIndex].color;
      activePlayers.splice(playerIndex, 1);
      console.log(`${disconnectedColor.toUpperCase()} player disconnected`);
    }
    
    // Broadcast updated user count to remaining clients
    broadcastUserCount();
    
    // Broadcast updated game status
    broadcastGameStatus();
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
