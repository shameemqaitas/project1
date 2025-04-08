const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, unique: true },
  questionArabic: { type: String, required: true },
  score: { type: Number, default: 0 }, // Score for the question (e.g., points earned)
  weight: { type: Number, default: 1 }, // Weight for weighted average (default to 1 if unweighted)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', questionSchema);