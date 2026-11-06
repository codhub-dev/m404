const router = require('express').Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SESSION_SECRET;

function issueToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=access_denied`,
    session: false,
  }),
  (req, res) => {
    const token = issueToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback#token=${token}`);
  }
);

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ user: null });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ user: null });
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        appAccess: user.appAccess,
      },
    });
  } catch {
    res.status(401).json({ user: null });
  }
});

router.post('/logout', (req, res) => res.json({ ok: true }));

module.exports = router;
