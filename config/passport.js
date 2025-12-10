const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');
const createToken = require('../utils/createToken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8000/api/v1/auth/google/callback' 
        : process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'], // Force scope here to avoid invalid_request error
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              profileImg: profile.photos[0].value,
            });
          }
        }
        const token = createToken(user._id);
        done(null, { user, token });
      } catch (err) {
        done(err, false);
      }
    }
  )
);
