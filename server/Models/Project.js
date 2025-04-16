const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  projectName: { type: String, required: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  telephone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  competencies: [{ type: Schema.Types.ObjectId, ref: 'Competency' }],
  tests: [{ type: Schema.Types.ObjectId, ref: 'Test' }],
  testId: { type: Schema.Types.ObjectId, ref: 'Test' },
  pendingLeadassessor: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  pendingAssessor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  pendingCandidates: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  selectedLeadassessor: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  selectedAssessor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  selectedCandidates: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  selectedClients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  candidateBatches: [{
    batchName: { type: String, required: true },
    candidates: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
  }],
  groups: [{
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    candidates: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    groupName: { type: String, required: true, default: () => `Group ${Date.now()}` },
    createdAt: { type: Date, default: Date.now }
  }],
  scoringMechanism: {
    type: String,
    enum: ['normal', 'weighted3', 'weighted5'],
    default: 'normal'
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);