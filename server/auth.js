const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { findUserById, createOrUpdateUser } = require('./database');

// Serialize user for session - store only the database ID
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session - retrieve full user from database
passport.deserializeUser((id, done) => {
  try {
    const user = findUserById(id);
    if (user) {
      done(null, user);
    } else {
      done(new Error('User not found'), null);
    }
  } catch (error) {
    done(error, null);
  }
});

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    try {
      // Prepare user data from Google profile
      const userData = {
        provider: 'google',
        providerId: profile.id,
        displayName: profile.displayName,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
        photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      };
      
      // Create or update user in database
      const user = createOrUpdateUser(userData);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Configure GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    try {
      // Prepare user data from GitHub profile
      const userData = {
        provider: 'github',
        providerId: profile.id,
        displayName: profile.displayName || profile.username,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
        photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      };
      
      // Create or update user in database
      const user = createOrUpdateUser(userData);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

module.exports = passport;
