const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: String, required: true },
  company: { type: String },
  email: { type: String, required: true, unique: true }, // Only email is unique
  countryCode: { type: String, required: true },
  phone: { type: String, required: true }, // No unique constraint
  password: { type: String, required: true },
  role: { type: String, enum: ['Candidate', 'Assessor', 'Leadassessor', 'Admin', 'Client'], default: 'Candidate' },
  cv: { type: String },
});

module.exports = mongoose.model('User', userSchema);