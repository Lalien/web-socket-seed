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

// Game state tracking
let gameState = {
  phase: 'waiting', // waiting, rolling, color-selection, active
  diceRolls: {},
  winner: null,
  loser: null
};

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
  if (playerCount === MAX_PLAYERS && gameState.phase === 'active') {
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

// Start dice roll when 2 players are connected
function startDiceRoll() {
  if (activePlayers.length !== MAX_PLAYERS) {
    return;
  }
  
  gameState.phase = 'rolling';
  gameState.diceRolls = {};
  gameState.winner = null;
  gameState.loser = null;
  
  // Generate dice rolls for both players
  activePlayers.forEach((player, index) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    gameState.diceRolls[index] = roll;
  });
  
  // Broadcast dice roll start to both players
  activePlayers.forEach((player, index) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'diceRollStart',
        playerIndex: index,
        roll: gameState.diceRolls[index]
      }));
    }
  });
  
  // After animation delay, determine winner
  setTimeout(() => {
    determineDiceWinner();
  }, 3000); // 3 second delay for animation
}

// Determine winner from dice rolls
function determineDiceWinner() {
  const roll1 = gameState.diceRolls[0];
  const roll2 = gameState.diceRolls[1];
  
  // Check for tie
  if (roll1 === roll2) {
    // Broadcast tie, then restart roll
    activePlayers.forEach((player, index) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: 'diceRollTie',
          message: 'It\'s a tie! Rolling again...'
        }));
      }
    });
    
    // Restart roll after delay
    setTimeout(() => {
      startDiceRoll();
    }, 2000);
    return;
  }
  
  // Determine winner
  const winnerIndex = roll1 > roll2 ? 0 : 1;
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  
  gameState.winner = winnerIndex;
  gameState.loser = loserIndex;
  gameState.phase = 'color-selection';
  
  // Notify both players of result
  activePlayers.forEach((player, index) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'diceRollWinner',
        isWinner: index === winnerIndex,
        winnerIndex: winnerIndex,
        loserIndex: loserIndex
      }));
    }
  });
}

// Handle color selection from winner
function handleColorSelection(color) {
  if (gameState.phase !== 'color-selection') {
    return;
  }
  
  const winnerPlayer = activePlayers[gameState.winner];
  const loserPlayer = activePlayers[gameState.loser];
  
  // Assign colors
  const loserColor = color === 'red' ? 'blue' : 'red';
  winnerPlayer.color = color;
  loserPlayer.color = loserColor;
  
  // Update game state to active
  gameState.phase = 'active';
  
  // Notify both players of their final color assignments
  if (winnerPlayer.ws.readyState === WebSocket.OPEN) {
    winnerPlayer.ws.send(JSON.stringify({
      type: 'colorAssigned',
      color: color,
      isActivePlayer: true
    }));
  }
  
  if (loserPlayer.ws.readyState === WebSocket.OPEN) {
    loserPlayer.ws.send(JSON.stringify({
      type: 'colorAssigned',
      color: loserColor,
      isActivePlayer: true
    }));
  }
  
  // Broadcast game status as active
  broadcastGameStatus();
  
  // Send game start to both players
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
  let playerIndex = null;

  // Add player to waiting list if there's room
  if (activePlayers.length < MAX_PLAYERS) {
    isActivePlayer = true;
    playerIndex = activePlayers.length;
    activePlayers.push({ ws, color: null, index: playerIndex });
    console.log(`Player ${playerIndex} joined (${activePlayers.length}/${MAX_PLAYERS})`);
  } else {
    console.log('Client connected as spectator (game is full)');
  }

  // Send initial state to the new client
  ws.send(JSON.stringify({
    type: 'initialState',
    gridState: gridState
  }));

  // Send player assignment (but no color yet)
  ws.send(JSON.stringify({
    type: 'playerAssignment',
    color: null,
    isActivePlayer: isActivePlayer,
    playerIndex: playerIndex
  }));

  // Broadcast updated user count to all clients
  broadcastUserCount();
  
  // Broadcast game status
  broadcastGameStatus();
  
  // If we now have 2 players, start the dice roll
  if (activePlayers.length === MAX_PLAYERS && gameState.phase === 'waiting') {
    setTimeout(() => {
      startDiceRoll();
    }, 1000); // 1 second delay before starting dice roll
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    try {
      const message = JSON.parse(data);
      
      // Handle color selection
      if (message.type === 'selectColor') {
        // Only allow the winner to select color
        if (playerIndex === gameState.winner && gameState.phase === 'color-selection') {
          handleColorSelection(message.color);
        }
        return;
      }
      
      // Handle grid toggle
      if (message.type === 'toggleSquare') {
        // Only allow active players to toggle squares
        if (!isActivePlayer) {
          console.log('Non-active player tried to toggle square');
          return;
        }
        
        // Get player color from the activePlayers array
        const playerData = activePlayers.find(p => p.ws === ws);
        if (!playerData || !playerData.color) {
          console.log('Player has no color assigned yet');
          return;
        }
        playerColor = playerData.color;
        
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
        // Validate and sanitize chat message
        if (message.message && typeof message.message === 'string') {
          const sanitizedMessage = message.message.trim().slice(0, 500); // Limit to 500 chars
          if (sanitizedMessage.length > 0) {
            // Get player color from the activePlayers array
            const playerData = activePlayers.find(p => p.ws === ws);
            const currentColor = playerData ? playerData.color : null;
            const sender = currentColor ? `${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} Player` : 'Spectator';
            broadcastChatMessage(sanitizedMessage, sender);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Remove from active players if they were an active player
    const playerIdx = activePlayers.findIndex(p => p.ws === ws);
    if (playerIdx !== -1) {
      const disconnectedColor = activePlayers[playerIdx].color;
      activePlayers.splice(playerIdx, 1);
      console.log(`Player ${playerIdx} disconnected (color: ${disconnectedColor})`);
      
      // Reset game state if a player disconnects
      gameState = {
        phase: 'waiting',
        diceRolls: {},
        winner: null,
        loser: null
      };
      
      // Notify remaining players
      activePlayers.forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: 'playerDisconnected',
            message: 'A player disconnected. Waiting for players...'
          }));
        }
      });
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
