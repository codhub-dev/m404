const router = require('express').Router();
const passport = require('../config/passport');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=access_denied`,
    session: true,
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/home`);
  }
);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({
    user: {
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      role: req.user.role,
      appAccess: req.user.appAccess,
    },
  });
});

router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.json({ ok: true });
  });
});

module.exports = router;
