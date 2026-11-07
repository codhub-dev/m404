const mongoose = require('mongoose');

const packetSchema = new mongoose.Schema({
  totalSachets: { type: Number, required: true },
  cost: { type: Number, default: null },       // optional price paid
  currency: { type: String, default: '£' },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  note: { type: String, default: '' },
});

module.exports = mongoose.model('Packet', packetSchema);
