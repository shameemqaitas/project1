const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  activityType: { type: String, required: true },
  description: String,
  date: { type: String, required: true },
  time: { type: String, required: true },
  prepare: { type: Number, required: true },
  present: { type: Number, required: true },
  require: { type: String, required: true },
  expect: { type: String, required: true },
  testpaper: { type: String, required: true },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New field
});

module.exports = mongoose.model('Test', testSchema);