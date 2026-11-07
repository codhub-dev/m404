const router = require('express').Router();
const ProteinLog = require('../models/ProteinLog');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } = require('date-fns');

function requireProteinAccess(req, res, next) {
  if (!req.user.appAccess.includes('protein') && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No access to protein tracker' });
  }
  next();
}

// GET /api/protein/leaderboard — all users' monthly sachet counts
router.get('/leaderboard', requireAuth, requireProteinAccess, async (req, res) => {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const users = await User.find({ isActive: true, appAccess: 'protein' }, 'name avatar email');

  const logs = await ProteinLog.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: '$userId', total: { $sum: '$sachets' }, lastLog: { $max: '$date' } } },
  ]);

  const logMap = {};
  logs.forEach((l) => { logMap[l._id.toString()] = l; });

  const leaderboard = users.map((u) => {
    const entry = logMap[u._id.toString()];
    return {
      user: { _id: u._id, name: u.name, avatar: u.avatar, email: u.email },
      total: entry?.total || 0,
      lastLog: entry?.lastLog || null,
    };
  }).sort((a, b) => b.total - a.total);

  res.json({ month: now.toISOString(), leaderboard });
});

// GET /api/protein/user/:userId/logs — any user's log history (visible to all)
router.get('/user/:userId/logs', requireAuth, requireProteinAccess, async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const logs = await ProteinLog.find({ userId: req.params.userId })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await ProteinLog.countDocuments({ userId: req.params.userId });
  res.json({ logs, total });
});

// GET /api/protein/my-logs — current user's log history
router.get('/my-logs', requireAuth, requireProteinAccess, async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const logs = await ProteinLog.find({ userId: req.user._id })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await ProteinLog.countDocuments({ userId: req.user._id });
  res.json({ logs, total });
});

// POST /api/protein/log — add or update a log for a specific date
// splitWithUserIds: array of other user IDs to share the sachets with equally
router.post('/log', requireAuth, requireProteinAccess, async (req, res) => {
  const { sachets = 1, date, note = '', splitWithUserIds = [] } = req.body;

  const totalSachets = Number(sachets);
  if (totalSachets <= 0 || totalSachets > 99) return res.status(400).json({ error: 'Invalid sachet count' });

  const logDate = date ? parseISO(date) : new Date();
  const isBackdated = startOfDay(logDate) < startOfDay(new Date());
  const dayStart = startOfDay(logDate);
  const dayEnd = endOfDay(logDate);

  // Deduplicate and exclude self
  const otherIds = [...new Set(splitWithUserIds.map(String).filter((id) => id !== req.user._id.toString()))];
  const participants = 1 + otherIds.length;
  // Round per-person share to 2 decimal places
  const perPerson = Math.round((totalSachets / participants) * 100) / 100;

  async function upsertLog(userId, amount) {
    let log = await ProteinLog.findOne({ userId, date: { $gte: dayStart, $lte: dayEnd } });
    if (log) {
      log.sachets = Math.min(Math.round((log.sachets + amount) * 100) / 100, 99);
      log.note = note || log.note;
      log.loggedAt = new Date();
      await log.save();
    } else {
      log = await ProteinLog.create({ userId, date: dayStart, sachets: amount, note, isBackdated, loggedAt: new Date() });
    }
    return log;
  }

  const myLog = await upsertLog(req.user._id, perPerson);
  for (const uid of otherIds) {
    await upsertLog(uid, perPerson);
  }

  res.status(201).json(myLog);
});

// DELETE /api/protein/log/:id — delete a specific log
router.delete('/log/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const log = await ProteinLog.findOne({ _id: req.params.id, userId: req.user._id });
  if (!log) return res.status(404).json({ error: 'Log not found' });
  await log.deleteOne();
  res.json({ ok: true });
});

// PATCH /api/protein/log/:id — update sachets/note on a specific log
router.patch('/log/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const { sachets, note } = req.body;
  const log = await ProteinLog.findOne({ _id: req.params.id, userId: req.user._id });
  if (!log) return res.status(404).json({ error: 'Log not found' });
  if (sachets !== undefined) log.sachets = Number(sachets);
  if (note !== undefined) log.note = note;
  await log.save();
  res.json(log);
});

module.exports = router;
