const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
    },
    advertiser: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    targetCountries: [String],
    targetAudience: {
      type: String, // e.g., "Gamers", "Students", "Doctors"
    },
    adType: {
      type: String,
      enum: ['banner', 'video', 'text'],
      required: true,
    },
    performance: {
      clicks: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    budget: Number,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);