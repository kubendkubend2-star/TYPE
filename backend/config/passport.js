const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

  if (!clientID || !clientSecret || clientID.includes('your_google_client_id')) {
    console.warn('⚠️ Google OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured. Google Login will be disabled until valid credentials are provided in .env');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;
          const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
          const googleId = profile.id;
          const displayName = profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : 'Typist');

          if (!email) {
            return done(new Error('No email found in Google account profile.'), null);
          }

          // 1. Try to find user by googleId
          let user = await User.findOne({ googleId });
          if (user) {
            // Update photo if missing
            if (!user.profilePicture && photo) {
              user.profilePicture = photo;
              await user.save();
            }
            return done(null, user);
          }

          // 2. Account linking: check if user already exists with this verified email
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            if (!user.profilePicture && photo) {
              user.profilePicture = photo;
            }
            // Keep existing username & stats
            await user.save();
            return done(null, user);
          }

          // 3. Create new user with unique username
          let baseUsername = displayName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15);
          if (!baseUsername || baseUsername.length < 3) {
            baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15);
          }
          if (!baseUsername || baseUsername.length < 3) {
            baseUsername = 'Typist';
          }

          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter++}`;
          }

          const newUser = new User({
            username,
            email,
            googleId,
            profilePicture: photo,
            authenticationProvider: 'google',
            totalGames: 0,
            wins: 0,
            losses: 0,
            bestWPM: 0,
            bestAccuracy: 100,
            totalScore: 0
          });

          await newUser.save();
          return done(null, newUser);
        } catch (err) {
          console.error('Error during Google Strategy authentication:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}

module.exports = {
  configurePassport
};
