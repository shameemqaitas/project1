const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  message: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Leadassessor', 'Assessor', 'Candidate', 'Client'], 
    required: true 
  },
  invitationStatus: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'], 
    default: 'pending' 
  },
  schedules: [{
    eventDate: { type: Date, required: true },
    eventTime: { type: String, required: true }
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);