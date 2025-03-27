const mongoose = require('mongoose');

const behaviourSchema = new mongoose.Schema({
  skillsetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skillset', required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Behaviour', behaviourSchema);