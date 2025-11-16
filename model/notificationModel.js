const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a user.'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'error', 'promotion'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: String, // Optional link related to the notification
    // You can add more fields here, e.g., 'relatedEntity' for a specific campaign, etc.
  },
  { timestamps: true }
);

// Index for faster lookup by user and read status
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
