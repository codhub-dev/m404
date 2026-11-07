const mongoose = require('mongoose');

const proteinLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    sachets: { type: Number, required: true, min: 0.01, max: 99, default: 1 },
    note: { type: String, default: '' },
    isBackdated: { type: Boolean, default: false },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One log per user per date (prevent duplicate day entries — use upsert logic in route if needed)
proteinLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ProteinLog', proteinLogSchema);
