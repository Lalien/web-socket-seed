const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const passport = require('./auth');
const { ensureAuthenticated } = require('./middleware');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('ERROR: SESSION_SECRET must be set in production environment');
  process.exit(1);
}

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Middleware setup
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Authentication routes with rate limiting
app.get('/auth/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  authLimiter,
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/github',
  authLimiter,
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  authLimiter,
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', authLimiter, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/login');
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Check which OAuth providers are configured
app.get('/auth/providers', (req, res) => {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  };
  res.json(providers);
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/login.html'));
});

// Protect the main app - require authentication
app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Serve static files from the dist directory (for authenticated users)
app.use(express.static(path.join(__dirname, '../dist')));

// Constants
const MAX_PLAYERS = 2;

// Lobby management - Map of lobby name to lobby object
const lobbies = new Map();

// Helper function to create initial grid state
function createInitialGridState() {
  return Array(10).fill(null).map(() => Array(10).fill('lime'));
}

// Helper function to create initial game state
function createInitialGameState() {
  return {
    phase: 'waiting', // waiting, rolling, color-selection, active
    diceRolls: {},
    winner: null,
    loser: null
  };
}

// Create a new lobby
function createLobby(lobbyName) {
  if (lobbies.has(lobbyName)) {
    return null; // Lobby already exists
  }
  
  const lobby = {
    name: lobbyName,
    players: [],
    gridState: createInitialGridState(),
    gameState: createInitialGameState()
  };
  
  lobbies.set(lobbyName, lobby);
  console.log(`Lobby created: ${lobbyName}`);
  broadcastLobbyList();
  return lobby;
}

// Join a lobby
function joinLobby(lobbyName, ws) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby) {
    return { success: false, error: 'Lobby not found' };
  }
  
  if (lobby.players.length >= MAX_PLAYERS) {
    return { success: false, error: 'Lobby is full' };
  }
  
  const playerIndex = lobby.players.length;
  lobby.players.push({ ws, color: null, index: playerIndex });
  console.log(`Player ${playerIndex} joined lobby: ${lobbyName} (${lobby.players.length}/${MAX_PLAYERS})`);
  
  broadcastLobbyList();
  return { success: true, lobby, playerIndex };
}

// Leave a lobby
function leaveLobby(lobbyName, ws) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby) {
    return;
  }
  
  const playerIdx = lobby.players.findIndex(p => p.ws === ws);
  if (playerIdx !== -1) {
    const disconnectedColor = lobby.players[playerIdx].color;
    lobby.players.splice(playerIdx, 1);
    console.log(`Player ${playerIdx} left lobby: ${lobbyName} (color: ${disconnectedColor})`);
    
    // Reset game state if a player leaves
    lobby.gameState = createInitialGameState();
    
    // Notify remaining players in the lobby
    lobby.players.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: 'playerDisconnected',
          message: 'A player disconnected. Waiting for players...'
        }));
      }
    });
    
    // Broadcast game status to lobby
    broadcastGameStatus(lobbyName);
    
    // Delete lobby if empty
    if (lobby.players.length === 0) {
      lobbies.delete(lobbyName);
      console.log(`Lobby deleted (empty): ${lobbyName}`);
      broadcastLobbyList();
    }
  }
}

// Get lobby for a WebSocket connection
function getLobbyForWs(ws) {
  for (const [name, lobby] of lobbies.entries()) {
    if (lobby.players.some(p => p.ws === ws)) {
      return { name, lobby };
    }
  }
  return null;
}

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

// Broadcast lobby list to all clients
function broadcastLobbyList() {
  const lobbyList = Array.from(lobbies.values()).map(lobby => ({
    name: lobby.name,
    playerCount: lobby.players.length,
    maxPlayers: MAX_PLAYERS
  }));
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'lobbyList',
        lobbies: lobbyList
      }));
    }
  });
}

// Broadcast game status to lobby
function broadcastGameStatus(lobbyName) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby) {
    return;
  }
  
  const playerCount = lobby.players.length;
  let status = 'waiting'; // waiting for players
  if (playerCount === MAX_PLAYERS && lobby.gameState.phase === 'active') {
    status = 'active'; // game is active
  }
  
  lobby.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'gameStatus',
        status: status,
        playerCount: playerCount
      }));
    }
  });
}

// Start dice roll when 2 players are connected
function startDiceRoll(lobbyName) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby || lobby.players.length !== MAX_PLAYERS) {
    return;
  }
  
  lobby.gameState.phase = 'rolling';
  lobby.gameState.diceRolls = {};
  lobby.gameState.winner = null;
  lobby.gameState.loser = null;
  
  // Generate dice rolls for both players
  lobby.players.forEach((player, index) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    lobby.gameState.diceRolls[index] = roll;
  });
  
  // Broadcast dice roll start to both players
  lobby.players.forEach((player, index) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'diceRollStart',
        playerIndex: index,
        roll: lobby.gameState.diceRolls[index]
      }));
    }
  });
  
  // After animation delay, determine winner
  setTimeout(() => {
    determineDiceWinner(lobbyName);
  }, 3000); // 3 second delay for animation
}

// Determine winner from dice rolls
function determineDiceWinner(lobbyName) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby) {
    return;
  }
  
  const roll1 = lobby.gameState.diceRolls[0];
  const roll2 = lobby.gameState.diceRolls[1];
  
  // Check for tie
  if (roll1 === roll2) {
    // Broadcast tie, then restart roll
    lobby.players.forEach((player, index) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: 'diceRollTie',
          message: 'It\'s a tie! Rolling again...'
        }));
      }
    });
    
    // Restart roll after delay
    setTimeout(() => {
      startDiceRoll(lobbyName);
    }, 2000);
    return;
  }
  
  // Determine winner
  const winnerIndex = roll1 > roll2 ? 0 : 1;
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  
  lobby.gameState.winner = winnerIndex;
  lobby.gameState.loser = loserIndex;
  lobby.gameState.phase = 'color-selection';
  
  // Notify both players of result
  lobby.players.forEach((player, index) => {
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
function handleColorSelection(lobbyName, color) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby || lobby.gameState.phase !== 'color-selection') {
    return;
  }
  
  const winnerPlayer = lobby.players[lobby.gameState.winner];
  const loserPlayer = lobby.players[lobby.gameState.loser];
  
  // Assign colors
  const loserColor = color === 'red' ? 'blue' : 'red';
  winnerPlayer.color = color;
  loserPlayer.color = loserColor;
  
  // Update game state to active
  lobby.gameState.phase = 'active';
  
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
  broadcastGameStatus(lobbyName);
  
  // Send game start to both players
  lobby.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'gameStart',
        message: 'Welcome to the game!',
        yourColor: player.color
      }));
    }
  });
}

// Broadcast chat message to lobby
function broadcastChatMessage(lobbyName, message, sender) {
  const lobby = lobbies.get(lobbyName);
  if (!lobby) {
    return;
  }
  
  lobby.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'chatMessage',
        message: message,
        sender: sender,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Helper function to authenticate WebSocket connections
function authenticateWebSocket(req, callback) {
  sessionMiddleware(req, {}, () => {
    passport.initialize()(req, {}, () => {
      passport.session()(req, {}, () => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          callback(null, false);
        } else {
          callback(req.user, true);
        }
      });
    });
  });
}

// WebSocket connection handling with authentication
wss.on('connection', (ws, req) => {
  authenticateWebSocket(req, (user, isAuthenticated) => {
    if (!isAuthenticated) {
      console.log('Unauthenticated WebSocket connection attempt');
      ws.close(1008, 'Not authenticated');
      return;
    }
    
    console.log('New authenticated client connected:', user.displayName);
    
    let currentLobbyName = null;
    let playerIndex = null;

  // Send lobby list to new client
  const lobbyList = Array.from(lobbies.values()).map(lobby => ({
    name: lobby.name,
    playerCount: lobby.players.length,
    maxPlayers: MAX_PLAYERS
  }));
  
  ws.send(JSON.stringify({
    type: 'lobbyList',
    lobbies: lobbyList
  }));

  // Broadcast updated user count to all clients
  broadcastUserCount();

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    try {
      const message = JSON.parse(data);
      
      // Handle lobby creation
      if (message.type === 'createLobby') {
        const lobbyName = message.lobbyName;
        
        // Validate lobby name
        if (!lobbyName || typeof lobbyName !== 'string' || lobbyName.trim().length === 0) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid lobby name'
          }));
          return;
        }
        
        const trimmedName = lobbyName.trim().slice(0, 50); // Limit to 50 chars
        
        // Check if already in a lobby
        if (currentLobbyName) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'You are already in a lobby'
          }));
          return;
        }
        
        // Create or get lobby
        let lobby = lobbies.get(trimmedName);
        if (!lobby) {
          lobby = createLobby(trimmedName);
        }
        
        if (!lobby) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to create lobby'
          }));
          return;
        }
        
        // Join the lobby
        const result = joinLobby(trimmedName, ws);
        if (result.success) {
          currentLobbyName = trimmedName;
          playerIndex = result.playerIndex;
          
          // Send initial state to the client
          ws.send(JSON.stringify({
            type: 'initialState',
            gridState: lobby.gridState
          }));
          
          // Send player assignment
          ws.send(JSON.stringify({
            type: 'playerAssignment',
            color: null,
            isActivePlayer: true,
            playerIndex: playerIndex
          }));
          
          // Send lobby joined confirmation
          ws.send(JSON.stringify({
            type: 'lobbyJoined',
            lobbyName: trimmedName
          }));
          
          // Broadcast game status to lobby
          broadcastGameStatus(trimmedName);
          
          // If we now have 2 players, start the dice roll
          if (lobby.players.length === MAX_PLAYERS && lobby.gameState.phase === 'waiting') {
            setTimeout(() => {
              startDiceRoll(trimmedName);
            }, 1000);
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: result.error
          }));
        }
        return;
      }
      
      // Handle joining a lobby
      if (message.type === 'joinLobby') {
        const lobbyName = message.lobbyName;
        
        // Check if already in a lobby
        if (currentLobbyName) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'You are already in a lobby'
          }));
          return;
        }
        
        const result = joinLobby(lobbyName, ws);
        if (result.success) {
          currentLobbyName = lobbyName;
          playerIndex = result.playerIndex;
          const lobby = result.lobby;
          
          // Send initial state to the client
          ws.send(JSON.stringify({
            type: 'initialState',
            gridState: lobby.gridState
          }));
          
          // Send player assignment
          ws.send(JSON.stringify({
            type: 'playerAssignment',
            color: null,
            isActivePlayer: true,
            playerIndex: playerIndex
          }));
          
          // Send lobby joined confirmation
          ws.send(JSON.stringify({
            type: 'lobbyJoined',
            lobbyName: lobbyName
          }));
          
          // Broadcast game status to lobby
          broadcastGameStatus(lobbyName);
          
          // If we now have 2 players, start the dice roll
          if (lobby.players.length === MAX_PLAYERS && lobby.gameState.phase === 'waiting') {
            setTimeout(() => {
              startDiceRoll(lobbyName);
            }, 1000);
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: result.error
          }));
        }
        return;
      }
      
      // Handle leaving a lobby
      if (message.type === 'leaveLobby') {
        if (currentLobbyName) {
          leaveLobby(currentLobbyName, ws);
          currentLobbyName = null;
          playerIndex = null;
          
          ws.send(JSON.stringify({
            type: 'lobbyLeft'
          }));
          
          // Send updated lobby list
          const lobbyList = Array.from(lobbies.values()).map(lobby => ({
            name: lobby.name,
            playerCount: lobby.players.length,
            maxPlayers: MAX_PLAYERS
          }));
          
          ws.send(JSON.stringify({
            type: 'lobbyList',
            lobbies: lobbyList
          }));
        }
        return;
      }
      
      // Handle get lobby list
      if (message.type === 'getLobbyList') {
        const lobbyList = Array.from(lobbies.values()).map(lobby => ({
          name: lobby.name,
          playerCount: lobby.players.length,
          maxPlayers: MAX_PLAYERS
        }));
        
        ws.send(JSON.stringify({
          type: 'lobbyList',
          lobbies: lobbyList
        }));
        return;
      }
      
      // All other messages require being in a lobby
      if (!currentLobbyName) {
        return;
      }
      
      const lobby = lobbies.get(currentLobbyName);
      if (!lobby) {
        return;
      }
      
      // Handle color selection
      if (message.type === 'selectColor') {
        // Only allow the winner to select color
        if (playerIndex === lobby.gameState.winner && lobby.gameState.phase === 'color-selection') {
          handleColorSelection(currentLobbyName, message.color);
        }
        return;
      }
      
      // Handle grid toggle
      if (message.type === 'toggleSquare') {
        // Get player data
        const playerData = lobby.players.find(p => p.ws === ws);
        if (!playerData || !playerData.color) {
          console.log('Player has no color assigned yet');
          return;
        }
        const playerColor = playerData.color;
        
        const { row, col } = message;
        // Only allow players to place their assigned color
        // Toggle from lime to player's color, or from player's color back to lime
        if (lobby.gridState[row][col] === 'lime') {
          lobby.gridState[row][col] = playerColor;
        } else if (lobby.gridState[row][col] === playerColor) {
          lobby.gridState[row][col] = 'lime';
        } else {
          // Square is another player's color, don't allow toggle
          console.log(`Player ${playerColor} tried to toggle ${lobby.gridState[row][col]} square`);
          return;
        }
        
        // Broadcast the change to all players in the lobby
        lobby.players.forEach((player) => {
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({
              type: 'squareToggled',
              row: row,
              col: col,
              color: lobby.gridState[row][col]
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
            // Get player color
            const playerData = lobby.players.find(p => p.ws === ws);
            const currentColor = playerData ? playerData.color : null;
            const sender = currentColor ? `${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} Player` : 'Player';
            broadcastChatMessage(currentLobbyName, sanitizedMessage, sender);
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
    
    // Remove from lobby if they were in one
    if (currentLobbyName) {
      leaveLobby(currentLobbyName, ws);
    }
    
    // Broadcast updated user count to remaining clients
    broadcastUserCount();
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
