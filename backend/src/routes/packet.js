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

  // Filter logs by packetId for accuracy
  const logs = await ProteinLog.find({ packetId: packet._id });

  // Aggregate per user
  const usageMap = {};
  let totalUsed = 0;
  logs.forEach((log) => {
    const uid = log.userId.toString();
    usageMap[uid] = Math.round(((usageMap[uid] || 0) + log.sachets) * 100) / 100;
    totalUsed += log.sachets;
  });

  // Attach user names
  const userIds = Object.keys(usageMap);
  const users = await User.find({ _id: { $in: userIds } }, 'name avatar');
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const usage = userIds.map((uid) => ({
    user: userMap[uid] ? { _id: userMap[uid]._id, name: userMap[uid].name, avatar: userMap[uid].avatar } : { _id: uid, name: 'Unknown' },
    sachets: Math.round(usageMap[uid]),
    pct: totalUsed > 0 ? Math.round((usageMap[uid] / totalUsed) * 100) : 0,
    amountOwed: packet.cost && packet.totalSachets > 0 ? ((usageMap[uid] / packet.totalSachets) * packet.cost).toFixed(2) : null,
  })).sort((a, b) => b.sachets - a.sachets);

  const daysRunning = Math.max(1, Math.ceil((Date.now() - new Date(packet.openedAt)) / (1000 * 60 * 60 * 24)));

  const totalUsedInt = Math.round(totalUsed);
  res.json({
    packet,
    totalUsed: totalUsedInt,
    remaining: Math.max(0, packet.totalSachets - totalUsedInt),
    daysRunning,
    avgPerDay: (totalUsedInt / daysRunning).toFixed(1),
    usage,
  });
});

// POST /api/packet/open — open a new packet (closes any existing active one first)
router.post('/open', requireAuth, requireProteinAccess, async (req, res) => {
  const { name, totalSachets, cost, currency, note } = req.body;
  if (!totalSachets || totalSachets < 1) return res.status(400).json({ error: 'totalSachets required' });

  await Packet.updateMany({ isActive: true }, { isActive: false, closedAt: new Date() });

  const packet = await Packet.create({
    name: name || '',
    totalSachets: Number(totalSachets),
    cost: cost ? Number(cost) : null,
    currency: currency || '₹',
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

// POST /api/packet/reactivate/:id — reopen a closed packet for editing
// Closes the current active packet first
router.post('/reactivate/:id', requireAuth, requireProteinAccess, async (req, res) => {
  const packet = await Packet.findById(req.params.id);
  if (!packet) return res.status(404).json({ error: 'Packet not found' });
  if (packet.isActive) return res.json({ packet });

  await Packet.updateMany({ isActive: true }, { isActive: false, closedAt: new Date() });

  packet.isActive = true;
  packet.closedAt = null;
  await packet.save();
  await packet.populate('openedBy', 'name avatar');

  res.json({ packet });
});

module.exports = router;
