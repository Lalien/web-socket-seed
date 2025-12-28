# OAuth Setup Guide

This guide will walk you through setting up OAuth authentication with Google and GitHub for the web-socket-seed application.

## Prerequisites

Before you begin, you'll need:
- A Google account (for Google OAuth)
- A GitHub account (for GitHub OAuth)
- The application running locally or deployed

**Note:** You must configure at least one OAuth provider (Google or GitHub) for the application to work.

## Setting Up Google OAuth

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" in the top navigation bar
3. Click "New Project"
4. Enter a project name (e.g., "WebSocket Game")
5. Click "Create"

### Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Navigate to "APIs & Services" > "Library"
3. Search for "Google+ API"
4. Click on it and press "Enable"

### Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type
3. Click "Create"
4. Fill in the required fields:
   - App name: "WebSocket Game" (or your preferred name)
   - User support email: Your email
   - Developer contact information: Your email
5. Click "Save and Continue"
6. Skip the "Scopes" step (click "Save and Continue")
7. Add test users if needed (for development)
8. Click "Save and Continue"

### Step 4: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "WebSocket Game OAuth")
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000` (for local development)
   - Your production URL (if applicable)
6. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/auth/google/callback` (for local development)
   - Your production callback URL (if applicable): `https://yourdomain.com/auth/google/callback`
7. Click "Create"
8. Copy the **Client ID** and **Client Secret**

### Step 5: Add Credentials to .env

1. Open your `.env` file in the project root
2. Add your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

## Setting Up GitHub OAuth

### Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" in the left sidebar
3. Click "New OAuth App"

### Step 2: Configure the OAuth App

1. Fill in the application details:
   - **Application name**: "WebSocket Game" (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for local development)
   - **Application description**: Optional description of your app
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback` (for local development)
2. Click "Register application"

### Step 3: Generate Client Secret

1. After creating the app, you'll see your **Client ID**
2. Click "Generate a new client secret"
3. Copy the **Client Secret** (it will only be shown once!)

### Step 4: Add Credentials to .env

1. Open your `.env` file in the project root
2. Add your GitHub OAuth credentials:
   ```
   GITHUB_CLIENT_ID=your-client-id-here
   GITHUB_CLIENT_SECRET=your-client-secret-here
   GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
   ```

## Final Configuration

Your `.env` file should look like this:

```env
# Server Configuration
PORT=3000
SESSION_SECRET=your-random-secret-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

**Important Security Notes:**
- Never commit your `.env` file to version control
- Use strong, random values for `SESSION_SECRET` in production
- Keep your OAuth credentials secure and private

## Testing Your Setup

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

4. You should be redirected to the login page

5. Click on "Continue with Google" or "Continue with GitHub"

6. Complete the OAuth flow

7. You should be redirected back to the application and logged in

## Production Deployment

When deploying to production:

1. **Update OAuth Callback URLs**: In both Google Cloud Console and GitHub OAuth settings, add your production URLs:
   - Google: `https://yourdomain.com/auth/google/callback`
   - GitHub: `https://yourdomain.com/auth/github/callback`

2. **Update .env variables**:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
   ```

3. **Generate a strong SESSION_SECRET**: Use a cryptographically secure random string

4. **Enable secure cookies**: The application automatically uses secure cookies when `NODE_ENV=production`

## Troubleshooting

### "OAuth Not Configured" error
- Ensure at least one OAuth provider is configured in your `.env` file
- Verify that your Client ID and Client Secret are correct
- Restart the server after modifying the `.env` file

### Redirect URI mismatch error
- Verify that the callback URL in your `.env` file matches the one configured in Google Cloud Console or GitHub
- Make sure there are no trailing slashes in the URLs

### "Too many authentication attempts" error
- The application has rate limiting enabled (20 attempts per 15 minutes)
- Wait 15 minutes or restart the server to reset the limit

### WebSocket connection fails
- Ensure you're logged in through the OAuth flow
- Check browser console for authentication errors
- Clear your cookies and try logging in again

## Disabling an OAuth Provider

If you only want to use one OAuth provider:

1. Leave the other provider's credentials blank in `.env`:
   ```env
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   ```

2. The login page will automatically hide disabled providers

**Note:** You must have at least one OAuth provider configured for the application to work.
