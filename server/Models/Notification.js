// Models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  message: { type: String, required: true },
  schedules: [{
    eventDate: { type: Date, required: true },
    eventTime: { type: String, required: true }
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'], // Add 'failed' here
    default: 'pending',
    required: true
  }
});

module.exports = mongoose.model('Notification', notificationSchema);