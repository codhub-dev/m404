const mongoose = require('mongoose');

const proteinLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    sachets: { type: Number, required: true, min: 0.01, max: 99, default: 1 },
    note: { type: String, default: '' },
    isBackdated: { type: Boolean, default: false },
    loggedAt: { type: Date, default: Date.now },
    // Packet this log belongs to (null = logged before packet tracking)
    packetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Packet', default: null },
    // Links all entries created from the same split event
    splitGroupId: { type: String, default: null },
  },
  { timestamps: false }
);

proteinLogSchema.index({ userId: 1, date: 1 });
proteinLogSchema.index({ packetId: 1 });
proteinLogSchema.index({ splitGroupId: 1 });

module.exports = mongoose.model('ProteinLog', proteinLogSchema);
