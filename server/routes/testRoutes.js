const express = require('express');
const router = express.Router();
const Test = require('../Models/Test');

// Create a new test
router.post('/', async (req, res) => {
  try {
    const newTest = new Test(req.body);
    await newTest.save();
    res.status(201).json({ message: 'Test created successfully', test: newTest });
  } catch (err) {
    res.status(500).json({ error: 'Error creating test', details: err.message });
  }
});

// Get all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().populate('selectedCandidates assessors grades.candidateId grades.assessorId');
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tests' });
  }
});

// Get a specific test by ID
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('selectedCandidates assessors grades.candidateId grades.assessorId');
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching test' });
  }
});

// Update a test (e.g., add candidates, assessors, grades)
router.put('/:id', async (req, res) => {
  try {
    const updatedTest = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTest) return res.status(404).json({ error: 'Test not found' });
    res.json(updatedTest);
  } catch (err) {
    res.status(500).json({ error: 'Error updating test' });
  }
});

// Delete a test
router.delete('/:id', async (req, res) => {
  try {
    const deletedTest = await Test.findByIdAndDelete(req.params.id);
    if (!deletedTest) return res.status(404).json({ error: 'Test not found' });
    res.json({ message: 'Test deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting test' });
  }
});

module.exports = router;
