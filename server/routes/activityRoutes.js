const express = require('express');
const router = express.Router();
const Activity = require('../Models/Activity');

// Create an activity
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const existingActivity = await Activity.findOne({ name });
    if (existingActivity) return res.status(400).json({ error: 'Activity already exists' });

    const newActivity = new Activity({ name });
    await newActivity.save();
    res.status(201).json({ message: 'Activity created successfully', activity: newActivity });
  } catch (err) {
    res.status(500).json({ error: 'Error creating activity' });
  }
});

// Get all activities
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching activities' });
  }
});

// Delete an activity
router.delete('/:id', async (req, res) => {
  try {
    const deletedActivity = await Activity.findByIdAndDelete(req.params.id);
    if (!deletedActivity) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting activity' });
  }
});

module.exports = router;
