const router = require('express').Router();
const mongoose = require('mongoose');
const ProteinLog = require('../models/ProteinLog');
const Packet = require('../models/Packet');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } = require('date-fns');

function requireProteinAccess(req, res, next) {
  if (!req.user.appAccess.includes('protein') && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No access to protein tracker' });
  }
  next();
}

// GET /api/protein/leaderboard
// Scoped to active packet when one exists; falls back to current month
router.get('/leaderboard', requireAuth, requireProteinAccess, async (req, res) => {
  const activePacket = await Packet.findOne({ isActive: true });

  let matchFilter;
  if (activePacket) {
    matchFilter = { packetId: activePacket._id };
  } else {
    const now = new Date();
    matchFilter = { date: { $gte: startOfMonth(now), $lte: endOfMonth(now) } };
  }

  const users = await User.find({ isActive: true, appAccess: 'protein' }, 'name avatar email');

  const logs = await ProteinLog.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$userId', total: { $sum: '$sachets' }, lastLog: { $max: '$date' } } },
  ]);

  const logMap = {};
  logs.forEach((l) => { logMap[l._id.toString()] = l; });

  const leaderboard = users.map((u) => {
    const entry = logMap[u._id.toString()];
    return {
      user: { _id: u._id, name: u.name, avatar: u.avatar, email: u.email },
      total: entry ? Math.round(entry.total * 100) / 100 : 0,
      lastLog: entry?.lastLog || null,
    };
  }).sort((a, b) => b.total - a.total);

  res.json({ packetScoped: !!activePacket, leaderboard });
});

// GET /api/protein/user/:userId/logs — any user's log history
router.get('/user/:userId/logs', requireAuth, requireProteinAccess, async (req, res) => {
  const { page = 1, limit = 50, packetId } = req.query;
  const filter = { userId: req.params.userId };
  if (packetId) filter.packetId = packetId;

  const logs = await ProteinLog.find(filter)
    .sort({ date: -1, loggedAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await ProteinLog.countDocuments(filter);
  res.json({ logs, total });
});

// GET /api/protein/my-logs
router.get('/my-logs', requireAuth, requireProteinAccess, async (req, res) => {
  const { page = 1, limit = 50, packetId } = req.query;
  const filter = { userId: req.user._id };
  if (packetId) filter.packetId = packetId;

  const logs = await ProteinLog.find(filter)
    .sort({ date: -1, loggedAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await ProteinLog.countDocuments(filter);
  res.json({ logs, total });
});

// POST /api/protein/log
router.post('/log', requireAuth, requireProteinAccess, async (req, res) => {
  const { sachets = 1, date, note = '', splitWithUserIds = [] } = req.body;

  const totalSachets = Number(sachets);
  if (totalSachets <= 0 || totalSachets > 99) return res.status(400).json({ error: 'Invalid sachet count' });

  const logDate = date ? parseISO(date) : new Date();
  const isBackdated = startOfDay(logDate) < startOfDay(new Date());
  const dayStart = startOfDay(logDate);
  const dayEnd = endOfDay(logDate);

  const activePacket = await Packet.findOne({ isActive: true });
  if (!activePacket) return res.status(400).json({ error: 'No active packet — open a packet first' });
  const packetId = activePacket._id;

  // Check remaining capacity
  const usageAgg = await ProteinLog.aggregate([
    { $match: { packetId } },
    { $group: { _id: null, total: { $sum: '$sachets' } } },
  ]);
  const currentUsed = usageAgg[0]?.total || 0;
  const remaining = Math.round((activePacket.totalSachets - currentUsed) * 100) / 100;
  if (totalSachets > remaining) {
    return res.status(400).json({
      error: `Only ${remaining} sachet${remaining !== 1 ? 's' : ''} remaining in this packet`,
    });
  }

  const otherIds = [...new Set(splitWithUserIds.map(String).filter((id) => id !== req.user._id.toString()))];

  if (otherIds.length > 0) {
    const participants = 1 + otherIds.length;
    const perPerson = Math.round((totalSachets / participants) * 100) / 100;
    const splitGroupId = new mongoose.Types.ObjectId().toString();
    const allParticipants = [req.user._id.toString(), ...otherIds];

    const created = await Promise.all(
      allParticipants.map((userId) =>
        ProteinLog.create({ userId, date: dayStart, sachets: perPerson, note, isBackdated, loggedAt: new Date(), packetId, splitGroupId })
      )
    );

    const myLog = created.find((l) => l.userId.toString() === req.user._id.toString());
    return res.status(201).json(myLog);
  }

  // Individual log: upsert (accumulate sachets for this day, non-split entries only)
  let log = await ProteinLog.findOne({ userId: req.user._id, date: { $gte: dayStart, $lte: dayEnd }, splitGroupId: null, packetId });
  if (log) {
    log.sachets = Math.round((log.sachets + totalSachets) * 100) / 100;
    log.note = note || log.note;
    log.loggedAt = new Date();
    log.packetId = packetId;
    await log.save();
  } else {
    log = await ProteinLog.create({ userId: req.user._id, date: dayStart, sachets: totalSachets, note, isBackdated, loggedAt: new Date(), packetId });
  }

  res.status(201).json(log);
});

// DELETE /api/protein/log/:id
// If the log is part of a split group, removes all entries in that group
router.delete('/log/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const log = await ProteinLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });

  // Ownership check: must own this entry OR be a participant in the same split group
  const isOwner = log.userId.toString() === req.user._id.toString();
  const isSplitParticipant = log.splitGroupId
    ? !!(await ProteinLog.findOne({ splitGroupId: log.splitGroupId, userId: req.user._id }))
    : false;

  if (!isOwner && !isSplitParticipant) return res.status(403).json({ error: 'Not authorized' });

  if (log.splitGroupId) {
    const count = await ProteinLog.countDocuments({ splitGroupId: log.splitGroupId });
    await ProteinLog.deleteMany({ splitGroupId: log.splitGroupId });
    return res.json({ ok: true, deletedCount: count, wasSplit: true });
  }

  await log.deleteOne();
  res.json({ ok: true, deletedCount: 1, wasSplit: false });
});

// PATCH /api/protein/log/:id — update sachets/note (individual logs only)
router.patch('/log/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const { sachets, note } = req.body;
  const log = await ProteinLog.findOne({ _id: req.params.id, userId: req.user._id });
  if (!log) return res.status(404).json({ error: 'Log not found' });

  if (sachets !== undefined) {
    const newSachets = Number(sachets);
    // Check packet capacity: remaining + current entry's sachets = headroom
    if (log.packetId) {
      const packet = await Packet.findById(log.packetId);
      if (packet) {
        const usageAgg = await ProteinLog.aggregate([
          { $match: { packetId: log.packetId } },
          { $group: { _id: null, total: { $sum: '$sachets' } } },
        ]);
        const currentUsed = usageAgg[0]?.total || 0;
        const remaining = Math.round((packet.totalSachets - currentUsed + log.sachets) * 100) / 100;
        if (newSachets > remaining) {
          return res.status(400).json({ error: `Only ${remaining} sachet${remaining !== 1 ? 's' : ''} remaining in this packet` });
        }
      }
    }
    log.sachets = newSachets;
  }
  if (note !== undefined) log.note = note;
  await log.save();
  res.json(log);
});

module.exports = router;
