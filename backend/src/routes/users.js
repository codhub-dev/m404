const router = require('express').Router();
const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin');

router.get('/', requireAdmin, async (req, res) => {
  const users = await User.find({}, '-googleId').sort({ createdAt: 1 });
  res.json(users);
});

router.post('/', requireAdmin, async (req, res) => {
  const { email, name, appAccess } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const user = await User.create({
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    appAccess: appAccess || [],
    isActive: true,
    role: 'user',
  });
  res.status(201).json(user);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { appAccess, isActive, name, role } = req.body;
  const update = {};
  if (appAccess !== undefined) update.appAccess = appAccess;
  if (isActive !== undefined) update.isActive = isActive;
  if (name) update.name = name;
  if (role && ['admin', 'user'].includes(role)) update.role = role;

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot remove admin' });
  await user.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
