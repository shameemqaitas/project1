// Models/Calendar.js
const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  event: {
    users: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, required: true },
    }],
    schedules: [{
      eventDate: { type: Date, required: true },
      eventTime: { type: String, required: true }, // e.g., "14:30"
    }],
  },
}, { timestamps: true });

module.exports = mongoose.model('Calendar', calendarSchema);