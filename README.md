# web-socket-seed

A seed project for using web sockets with Vue.js frontend and Node.js backend, built with Webpack.

## Features

- 🚀 Vue.js 3 frontend with reactive WebSocket integration
- 🔌 Node.js backend with WebSocket server (ws library)
- 📦 Webpack build system for frontend bundling
- 💬 Real-time chat application demo
- 🎨 Modern, responsive UI design
- 🔄 Automatic reconnection on disconnect

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Lalien/web-socket-seed.git
cd web-socket-seed
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Development

1. Build the frontend:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

### Development with Watch Mode

For frontend development with automatic rebuilds:

1. In one terminal, run webpack in watch mode:
```bash
npm run dev
```

2. In another terminal, start the server:
```bash
npm run dev:server
```

## Project Structure

```
web-socket-seed/
├── server/
│   └── index.js          # Node.js WebSocket server
├── src/
│   ├── App.vue           # Main Vue component
│   ├── main.js           # Vue app entry point
│   └── index.html        # HTML template
├── dist/                 # Built frontend files (generated)
├── webpack.config.js     # Webpack configuration
├── package.json          # Project dependencies
└── README.md            # This file
```

## How It Works

### Backend (Node.js + WebSocket)

The server (`server/index.js`) uses Express to serve static files and the `ws` library to handle WebSocket connections. It:

- Listens for WebSocket connections
- Broadcasts messages to all connected clients
- Sends system messages for connection events
- Serves the built frontend from the `dist` folder

### Frontend (Vue.js)

The Vue.js application (`src/App.vue`) provides:

- A real-time chat interface
- WebSocket connection management
- Automatic reconnection on disconnect
- Message history display with timestamps
- Connection status indicator

### Build System (Webpack)

Webpack bundles the Vue.js application with:

- Vue loader for `.vue` single-file components
- Babel for JavaScript transpilation
- CSS handling with style-loader and css-loader
- HTML plugin for index.html generation

## Customization

### Change the Port

Edit `server/index.js` and modify the PORT constant:
```javascript
const PORT = process.env.PORT || 3000;
```

### Modify the UI

Edit `src/App.vue` to customize the appearance and functionality of the frontend.

### Add More Features

- Add user authentication
- Implement private messaging
- Add file sharing capabilities
- Store message history in a database

## License

ISC
