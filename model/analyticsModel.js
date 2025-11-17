const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
  },
  path: {
    type: String,
  },
  method: {
    type: String,
  },
  status: {
    type: Number,
  },
  ip: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
