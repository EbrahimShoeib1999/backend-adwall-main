const mongoose = require('mongoose');

const miaSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      unique: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
    },
    keywords: [String],
    // To suggest answers based on subscription status
    subscriptionContext: {
      type: String,
      enum: ['active', 'expired', 'none'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mia', miaSchema);