const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    appAccess: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
