const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const isAdminEmail = email === process.env.ADMIN_EMAIL;

        let user = await User.findOne({ email });

        if (!user) {
          if (!isAdminEmail) {
            return done(null, false, { message: 'Access denied. Contact admin.' });
          }
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos[0]?.value || '',
            role: 'admin',
            appAccess: ['protein'],
            isActive: true,
          });
        } else {
          if (!user.isActive) {
            return done(null, false, { message: 'Account disabled. Contact admin.' });
          }
          if (!user.googleId) {
            user.googleId = profile.id;
            user.avatar = profile.photos[0]?.value || '';
            await user.save();
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
