const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.SESSION_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Not authenticated' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

module.exports = requireAdmin;
