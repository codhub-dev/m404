const router = require('express').Router();
const Packet = require('../models/Packet');
const ProteinLog = require('../models/ProteinLog');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { startOfDay } = require('date-fns');

function requireProteinAccess(req, res, next) {
  if (!req.user.appAccess.includes('protein') && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No access' });
  }
  next();
}

// GET /api/packet/current — active packet + usage breakdown
router.get('/current', requireAuth, requireProteinAccess, async (req, res) => {
  const packet = await Packet.findOne({ isActive: true }).populate('openedBy', 'name avatar');
  if (!packet) return res.json({ packet: null });

  const logs = await ProteinLog.find({ date: { $gte: packet.openedAt } });

  // Aggregate per user
  const usageMap = {};
  let totalUsed = 0;
  logs.forEach((log) => {
    const uid = log.userId.toString();
    usageMap[uid] = (usageMap[uid] || 0) + log.sachets;
    totalUsed += log.sachets;
  });

  // Attach user names
  const userIds = Object.keys(usageMap);
  const users = await User.find({ _id: { $in: userIds } }, 'name avatar');
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const usage = userIds.map((uid) => ({
    user: userMap[uid] ? { _id: userMap[uid]._id, name: userMap[uid].name, avatar: userMap[uid].avatar } : { _id: uid, name: 'Unknown' },
    sachets: usageMap[uid],
    pct: totalUsed > 0 ? Math.round((usageMap[uid] / totalUsed) * 100) : 0,
    amountOwed: packet.cost && totalUsed > 0 ? ((usageMap[uid] / totalUsed) * packet.cost).toFixed(2) : null,
  })).sort((a, b) => b.sachets - a.sachets);

  const daysRunning = Math.max(1, Math.ceil((Date.now() - new Date(packet.openedAt)) / (1000 * 60 * 60 * 24)));

  res.json({
    packet,
    totalUsed,
    remaining: Math.max(0, packet.totalSachets - totalUsed),
    daysRunning,
    avgPerDay: (totalUsed / daysRunning).toFixed(1),
    usage,
  });
});

// POST /api/packet/open — open a new packet (closes any existing active one first)
router.post('/open', requireAuth, requireProteinAccess, async (req, res) => {
  const { totalSachets, cost, currency, note } = req.body;
  if (!totalSachets || totalSachets < 1) return res.status(400).json({ error: 'totalSachets required' });

  // Close any currently active packet
  await Packet.updateMany({ isActive: true }, { isActive: false, closedAt: new Date() });

  const packet = await Packet.create({
    totalSachets: Number(totalSachets),
    cost: cost ? Number(cost) : null,
    currency: currency || '£',
    openedBy: req.user._id,
    note: note || '',
  });

  await packet.populate('openedBy', 'name avatar');
  res.status(201).json({ packet });
});

// POST /api/packet/close/:id — close a packet, return final cost summary
router.post('/close/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const packet = await Packet.findById(req.params.id);
  if (!packet) return res.status(404).json({ error: 'Packet not found' });

  packet.isActive = false;
  packet.closedAt = new Date();
  if (req.body.cost !== undefined) packet.cost = Number(req.body.cost);
  await packet.save();

  res.json({ packet });
});

// GET /api/packet/history — closed packets
router.get('/history', requireAuth, requireProteinAccess, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const packets = await Packet.find({ isActive: false })
    .sort({ closedAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('openedBy', 'name');
  const total = await Packet.countDocuments({ isActive: false });
  res.json({ packets, total });
});

module.exports = router;
