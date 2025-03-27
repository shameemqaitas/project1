// Models/Calendar.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const calendarSchema = new Schema({
  userId: { type: String, required: true }, // Lead Assessor ID
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  eventDate: { type: Date, required: true },
  eventTime: { type: String, required: true },
  title: { type: String, required: true }, // e.g., "Lead Assessor for Project X"
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Calendar', calendarSchema);