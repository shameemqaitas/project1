// Models/Test.js
const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  activityType: { type: String, required: true },
  description: String,
  date: { type: String, },
  time: { type: String,  },
  prepare: { type: Number, required: true }, // Preparation time in minutes
  present: { type: Number, required: true },
  require: { type: String, required: true },
  expect: { type: String, required: true },
  testpaper: { type: String, required: true },
  attendees: [
    {
      candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startTime: { type: Date, default: Date.now }, // When they joined
      remainingTime: { type: Number, default: null } // Remaining time in seconds
    },
  ],
  attended: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Test', TestSchema);