const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const marksSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  skillsetId: { type: Schema.Types.ObjectId, required: true },
  assessorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  marks: {
    type: Map,
    of: { type: Map, of: Number }, // { questionId: { candidateId: Number } }
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Marks', marksSchema);