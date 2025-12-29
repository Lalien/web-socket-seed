# web-socket-seed

A seed project for using web sockets with Vue.js frontend and Node.js backend, built with Webpack.

## Features

- 🚀 Vue.js 3 frontend with reactive WebSocket integration
- 🔌 Node.js backend with WebSocket server (ws library)
- 📦 Webpack build system for frontend bundling
- 💬 Real-time chat application demo
- 🎨 Modern, responsive UI design
- 🔄 Automatic reconnection on disconnect
- 🔐 OAuth authentication with Google and GitHub

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

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

3. Set up OAuth authentication:

   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and add your OAuth credentials:

   **For Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Create OAuth 2.0 credentials (Web application)
   - Add `http://localhost:3000/auth/google/callback` to authorized redirect URIs
   - Copy the Client ID and Client Secret to your `.env` file

   **For GitHub OAuth:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App
   - Set the Authorization callback URL to `http://localhost:3000/auth/github/callback`
   - Copy the Client ID and Client Secret to your `.env` file

   **Note:** You need to configure at least one OAuth provider (Google or GitHub) for the authentication to work.

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
- Handles OAuth authentication for Google and GitHub
- Protects WebSocket connections with session authentication

### Frontend (Vue.js)

The Vue.js application (`src/App.vue`) provides:

- A real-time chat interface
- WebSocket connection management
- Automatic reconnection on disconnect
- Message history display with timestamps
- Connection status indicator
- OAuth login page with Google and GitHub options

### Authentication

The application uses Passport.js for OAuth authentication:

- Users must log in with Google or GitHub before accessing the game
- Session management with express-session
- WebSocket connections are authenticated via session cookies
- Logout functionality to end the session

### Build System (Webpack)

Webpack bundles the Vue.js application with:

- Vue loader for `.vue` single-file components
- Babel for JavaScript transpilation
- CSS handling with style-loader and css-loader
- HTML plugin for index.html generation

## Customization

### Change the Port

Update the PORT variable in your `.env` file:
```
PORT=3000
```

### Modify the UI

Edit `src/App.vue` to customize the appearance and functionality of the frontend.

### Configure OAuth Providers

You can enable or disable OAuth providers by setting or removing their credentials in the `.env` file. At least one provider must be configured for authentication to work.

### Add More Features

- Add more OAuth providers (Twitter, Facebook, etc.)
- Implement user profiles and persistent data
- Add private messaging
- Add file sharing capabilities
- Store message history in a database
- Implement role-based access control

## License

ISC
