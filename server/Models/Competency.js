// backend/models/Competency.js
const mongoose = require('mongoose');

const competencySchema = new mongoose.Schema({
  competency: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  competencyArabic: { type: String, required: true },
  descriptionArabic: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  skillsets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skillset' }],
});

module.exports = mongoose.model('Competency', competencySchema);