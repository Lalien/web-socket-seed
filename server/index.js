const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    
    try {
      const message = JSON.parse(data);
      
      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'message',
            message: message.message,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
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
