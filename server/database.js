const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'users.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    google_id TEXT UNIQUE,
    github_id TEXT UNIQUE,
    photo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index on email for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
`);

// Create index on provider IDs
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)
`);

/**
 * Find a user by email
 * @param {string} email - User's email address
 * @returns {object|null} User object or null if not found
 */
function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

/**
 * Find a user by provider ID
 * @param {string} provider - OAuth provider ('google' or 'github')
 * @param {string} providerId - Provider-specific user ID
 * @returns {object|null} User object or null if not found
 */
function findUserByProviderId(provider, providerId) {
  let stmt;
  if (provider === 'google') {
    stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
  } else if (provider === 'github') {
    stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
  } else {
    return null;
  }
  return stmt.get(providerId);
}

/**
 * Find a user by database ID
 * @param {number} id - Database user ID
 * @returns {object|null} User object or null if not found
 */
function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

/**
 * Create a new user or update existing one
 * @param {object} userData - User data from OAuth provider
 * @returns {object} Created or updated user
 */
function createOrUpdateUser(userData) {
  const { provider, providerId, email, displayName, photo } = userData;
  
  // First check if user exists by provider ID
  let user = findUserByProviderId(provider, providerId);
  
  if (user) {
    // Update existing user with latest information including email
    const updateStmt = db.prepare(`
      UPDATE users 
      SET email = COALESCE(?, email), display_name = ?, photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(email, displayName, photo, user.id);
    return findUserById(user.id);
  }
  
  // Check if user exists with the same email from a different provider
  if (email) {
    user = findUserByEmail(email);
    
    if (user) {
      // Merge accounts - update the existing record with the new provider ID
      // If provider is Google, also update display name (Google is favored) and email
      if (provider === 'google') {
        const updateStmt = db.prepare(`
          UPDATE users 
          SET google_id = ?, email = COALESCE(?, email), display_name = ?, photo = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(providerId, email, displayName, photo, user.id);
      } else if (provider === 'github') {
        const updateStmt = db.prepare(`
          UPDATE users 
          SET github_id = ?, email = COALESCE(?, email), photo = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(providerId, email, photo, user.id);
      }
      return findUserById(user.id);
    }
  }
  
  // Create new user
  const insertStmt = db.prepare(`
    INSERT INTO users (email, display_name, google_id, github_id, photo)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const googleId = provider === 'google' ? providerId : null;
  const githubId = provider === 'github' ? providerId : null;
  
  const result = insertStmt.run(email, displayName, googleId, githubId, photo);
  return findUserById(result.lastInsertRowid);
}

module.exports = {
  findUserById,
  findUserByEmail,
  findUserByProviderId,
  createOrUpdateUser,
  db
};
