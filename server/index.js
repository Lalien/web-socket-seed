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

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send initial state to the new client
  ws.send(JSON.stringify({
    type: 'initialState',
    gridState: gridState
  }));

  // Broadcast updated user count to all clients
  broadcastUserCount();

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    try {
      const message = JSON.parse(data);
      
      // Handle grid toggle
      if (message.type === 'toggleSquare') {
        const { row, col } = message;
        // Toggle color
        gridState[row][col] = gridState[row][col] === 'lime' ? 'red' : 'lime';
        
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
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    // Broadcast updated user count to remaining clients
    broadcastUserCount();
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
