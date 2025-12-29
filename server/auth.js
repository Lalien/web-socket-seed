const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // User authenticated successfully
    const user = {
      id: profile.id,
      provider: 'google',
      displayName: profile.displayName,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
      photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null
    };
    return done(null, user);
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
    // User authenticated successfully
    const user = {
      id: profile.id,
      provider: 'github',
      displayName: profile.displayName || profile.username,
      username: profile.username,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
      photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null
    };
    return done(null, user);
  }));
}

module.exports = passport;
