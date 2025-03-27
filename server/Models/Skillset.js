// backend/models/Skillset.js
const mongoose = require('mongoose');

const skillsetSchema = new mongoose.Schema({
  skillset: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  skillsetArabic: { type: String, required: true },
  descriptionArabic: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
});

module.exports = mongoose.model('Skillset', skillsetSchema);