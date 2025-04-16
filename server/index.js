require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const User = require('./Models/User');
const Test = require('./Models/Test');
const Notification = require('./Models/Notification');
const Competency = require('./Models/Competency');
const Skillset = require('./Models/Skillset');
const Behaviour = require('./Models/Behaviour');
const Question = require('./Models/Question');
const Project = require('./Models/Project');
const Activity = require('./Models/Activity');
const Calendar = require('./Models/Calendar');
const nodemailer = require('nodemailer');
const Marks = require('./Models/Marks');
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const moment = require('moment');

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'shameem@qaitas.com', // Replace with your email
    pass: 'jtjgufyuftoozjtz ',    // Replace with your App Password (not regular password)
  },
});

// Verify Nodemailer on startup
transporter.verify((error, success) => {
  if (error) console.error('Nodemailer setup error:', error);
  else console.log('Nodemailer ready to send emails');
});



// Middleware
app.use(express.json());
app.use(cors());

// New Route: Fetch Lead Assessors
app.get('/api/users/leadassessors', async (req, res) => {
  try {
    const leadAssessors = await User.find({ role: 'Leadassessor' });
    res.status(200).json(leadAssessors);
  } catch (error) {
    console.error('❌ Error fetching lead assessors:', error);
    res.status(500).json({ message: 'Error fetching lead assessors', error: error.message });
  }
});

// User Registration Route (No JWT)


// User Login Route (No JWT)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required!' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials!' });
    }
    if (password !== user.password) { // Plain text comparison
      console.log('Password mismatch for email:', email);
      return res.status(401).json({ message: 'Invalid credentials!' });
    }
    console.log('Login successful for:', email);
    res.status(200).json({
      message: 'Login successful!',
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Fetch Candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await User.find({ role: 'Candidate' });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching candidates', error: error.message });
  }
});

// Fetch Assessors
app.get('/api/assessors', async (req, res) => {
  try {
    const assessors = await User.find({ role: 'Assessor' });
    res.json(assessors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assessors', error: error.message });
  }
});

// Delete Candidate
// Keep this endpoint for admin deletion outside project context if needed
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCandidate = await User.findByIdAndDelete(id);
    if (!deletedCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await Project.updateMany(
      {
        $or: [
          { selectedCandidates: id },
          { pendingCandidates: id },
          { 'candidateBatches.candidates': id },
        ],
      },
      {
        $pull: {
          selectedCandidates: id,
          pendingCandidates: id,
          'candidateBatches.$[].candidates': id,
        },
      }
    );

    await Project.updateMany({}, { $pull: { candidateBatches: { candidates: { $size: 0 } } } });

    res.status(200).json({ message: 'Candidate deleted successfully from users and projects' });
  } catch (error) {
    console.error('❌ Error deleting candidate:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Delete a user (for clients)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update User Role
// Update User Role
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', user });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Project Routes
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { companyName } = req.body;
    const existingProject = await Project.findOne({ companyName });
    if (existingProject) {
      return res.status(400).json({ message: 'A project with this company name already exists' });
    }

    const project = new Project(req.body);
    await project.save();
    res.status(201).json({ project });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A project with this company name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/projects/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const updatedData = req.body;

    const originalProject = await Project.findById(projectId);
    if (!originalProject) return res.status(404).json({ message: 'Project not found' });

    if (updatedData.companyName && updatedData.companyName !== originalProject.companyName) {
      const existingProject = await Project.findOne({ companyName: updatedData.companyName });
      if (existingProject) {
        return res.status(400).json({ message: 'A project with this company name already exists' });
      }
    }

    if (updatedData.selectedCandidates) {
      if (!Array.isArray(updatedData.selectedCandidates)) {
        return res.status(400).json({ message: 'selectedCandidates must be an array' });
      }
      const currentCandidates = originalProject.selectedCandidates || [];
      const newCandidates = updatedData.selectedCandidates.filter(
        candidateId => !currentCandidates.includes(candidateId)
      );
      updatedData.selectedCandidates = [...currentCandidates, ...newCandidates];
    }

    if (updatedData.selectedClients) {
      if (!Array.isArray(updatedData.selectedClients)) {
        return res.status(400).json({ message: 'selectedClients must be an array' });
      }
      const currentClients = originalProject.selectedClients || [];
      const newClients = updatedData.selectedClients.filter(
        clientId => !currentClients.includes(clientId)
      );
      updatedData.selectedClients = [...currentClients, ...newClients];
    }

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    res.json({ project });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A project with this company name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});


app.get('/api/users/clients', async (req, res) => {
  try {
    const clients = await User.find({ role: 'Client' });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
});

app.put('/api/projects/:projectId/add-batch', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { batchName, candidateIds } = req.body;

    if (!batchName || !candidateIds || !Array.isArray(candidateIds)) {
      return res.status(400).json({ message: 'Batch name and candidate IDs array are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check if batch name already exists
    if (project.candidateBatches.some(batch => batch.batchName === batchName)) {
      return res.status(400).json({ message: 'Batch name already exists' });
    }

    // Verify candidate IDs exist in selectedCandidates
    const invalidIds = candidateIds.filter(id => !project.selectedCandidates.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'Some candidate IDs are not assigned to this project' });
    }

    // Check if any candidate is already in another batch
    const allBatchCandidates = project.candidateBatches.flatMap(batch => batch.candidates);
    const alreadyAssigned = candidateIds.filter(id => allBatchCandidates.includes(id));
    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        message: 'Some candidates are already in another batch',
        assignedCandidates: alreadyAssigned
      });
    }

    project.candidateBatches.push({
      batchName,
      candidates: candidateIds,
    });

    await project.save();
    res.status(200).json({ message: 'Batch created', project });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.put('/api/projects/:projectId/update-batch', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { batchName, candidateIds } = req.body;

    if (!batchName || !candidateIds || !Array.isArray(candidateIds)) {
      return res.status(400).json({ message: 'Batch name and candidate IDs array are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const batch = project.candidateBatches.find(b => b.batchName === batchName);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Verify candidate IDs exist in selectedCandidates
    const invalidIds = candidateIds.filter(id => !project.selectedCandidates.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'Some candidate IDs are not assigned to this project' });
    }

    // Check for candidates already in other batches
    const allBatchCandidates = project.candidateBatches
      .filter(b => b.batchName !== batchName)
      .flatMap(b => b.candidates);
    const alreadyAssigned = candidateIds.filter(id => allBatchCandidates.includes(id));
    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        message: 'Some candidates are already in another batch',
        assignedCandidates: alreadyAssigned,
      });
    }

    // Update batch candidates
    batch.candidates = [...new Set([...batch.candidates, ...candidateIds])]; // Merge and remove duplicates
    await project.save();

    res.status(200).json({ message: 'Batch updated successfully', project });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Competency.deleteMany({ projectId });
    await Project.findByIdAndDelete(projectId);
    res.json({ message: 'Project and associated competencies deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove User from Project (Lead Assessor or Assessor)
// Remove User from Project (Lead Assessor, Assessor, Client, or Candidate)
app.put('/api/projects/:projectId/remove-user', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (!role || !['Leadassessor', 'Assessor', 'Client', 'Candidate'].includes(role)) {
      return res.status(400).json({ message: 'Role must be "Leadassessor", "Assessor", "Client", or "Candidate"' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user exists in the respective project array and remove them
    let removed = false;
    if (role === 'Leadassessor') {
      if (!project.selectedLeadassessor.includes(userId)) {
        return res.status(400).json({ message: 'User is not a lead assessor for this project' });
      }
      project.selectedLeadassessor = project.selectedLeadassessor.filter(
        id => id.toString() !== userId.toString()
      );
      removed = true;
    } else if (role === 'Assessor') {
      if (!project.selectedAssessor.includes(userId)) {
        return res.status(400).json({ message: 'User is not an assessor for this project' });
      }
      project.selectedAssessor = project.selectedAssessor.filter(
        id => id.toString() !== userId.toString()
      );
      removed = true;
    } else if (role === 'Client') {
      if (!project.selectedClients.includes(userId)) {
        return res.status(400).json({ message: 'User is not a client for this project' });
      }
      project.selectedClients = project.selectedClients.filter(
        id => id.toString() !== userId.toString()
      );
      removed = true;
    } else if (role === 'Candidate') {
      if (!project.selectedCandidates.includes(userId)) {
        return res.status(400).json({ message: 'User is not a candidate for this project' });
      }
      project.selectedCandidates = project.selectedCandidates.filter(
        id => id.toString() !== userId.toString()
      );
      // Also remove from candidateBatches if present
      project.candidateBatches.forEach(batch => {
        batch.candidates = batch.candidates.filter(
          id => id.toString() !== userId.toString()
        );
      });
      project.candidateBatches = project.candidateBatches.filter(batch => batch.candidates.length > 0);
      removed = true;
    }

    if (!removed) {
      return res.status(400).json({ message: 'User not found in the specified role for this project' });
    }

    // Save the updated project
    await project.save();

    res.status(200).json({ 
      message: `${role} removed from project successfully`, 
      project 
    });
  } catch (error) {
    console.error(`Error removing ${role} from project:`, error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Competency Routes
app.get('/api/competencies', async (req, res) => {
  try {
    const competencies = await Competency.find();
    res.json({ competencies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/competencies/:competencyId', async (req, res) => {
  try {
    const competency = await Competency.findById(req.params.competencyId);
    if (!competency) return res.status(404).json({ message: 'Competency not found' });
    res.json({ competency });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove Competency from Project
app.delete('/api/projects/:projectId/competencies/:competencyId', async (req, res) => {
  try {
    const { projectId, competencyId } = req.params;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(competencyId)) {
      return res.status(400).json({ message: 'Invalid competency ID' });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if the competency exists in the project
    const competencyIndex = project.competencies.findIndex(
      id => id.toString() === competencyId.toString()
    );
    if (competencyIndex === -1) {
      return res.status(400).json({ message: 'Competency not found in this project' });
    }

    // Remove the competency from the project's competencies array
    project.competencies.splice(competencyIndex, 1);
    await project.save();

    res.status(200).json({ 
      message: 'Competency removed from project successfully', 
      project 
    });
  } catch (error) {
    console.error('Error removing competency from project:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.post('/api/competencies', async (req, res) => {
  try {
    const { competency } = req.body;
    const existingCompetency = await Competency.findOne({ competency });
    if (existingCompetency) {
      return res.status(400).json({ message: 'A competency with this name already exists' });
    }

    const newCompetency = new Competency(req.body);
    await newCompetency.save();

    if (req.body.projectId) {
      const project = await Project.findById(req.body.projectId);
      if (project && !project.competencies.includes(newCompetency._id)) {
        project.competencies.push(newCompetency._id);
        await project.save();
      }
    }

    res.status(201).json({ competency: newCompetency });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A competency with this name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.get('/api/projects/:projectId/competencies', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('competencies');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ competencies: project.competencies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/competencies/:id', async (req, res) => {
  try {
    const competencyId = req.params.id;
    const updatedData = req.body;

    const originalCompetency = await Competency.findById(competencyId);
    if (!originalCompetency) return res.status(404).json({ message: 'Competency not found' });

    if (updatedData.competency && updatedData.competency !== originalCompetency.competency) {
      const existingCompetency = await Competency.findOne({
        competency: updatedData.competency,
      });
      if (existingCompetency && existingCompetency._id.toString() !== competencyId) {
        return res.status(400).json({ message: 'A competency with this name already exists' });
      }
    }

    const competency = await Competency.findByIdAndUpdate(competencyId, updatedData, { new: true });
    res.json({ competency });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A competency with this name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});



app.post('/api/projects/:projectId/competencies', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { competencyId } = req.body;

    const competency = await Competency.findById(competencyId);
    if (!competency) return res.status(404).json({ message: 'Competency not found' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.competencies.includes(competencyId)) {
      return res.status(400).json({ message: 'This competency is already linked to the project' });
    }

    project.competencies.push(competencyId);
    await project.save();

    res.status(201).json({ message: 'Competency linked successfully', competency });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Skillset Routes
app.get('/api/skillsets', async (req, res) => {
  try {
    const skillsets = await Skillset.find();
    res.json({ skillsets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/skillsets', async (req, res) => {
  try {
    const { skillset } = req.body;
    const existingSkillset = await Skillset.findOne({ skillset });
    if (existingSkillset) {
      return res.status(400).json({ message: 'A skillset with this name already exists' });
    }

    const newSkillset = new Skillset(req.body);
    await newSkillset.save();
    res.status(201).json({ skillset: newSkillset });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A skillset with this name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.get('/api/competencies/:competencyId/skillsets', async (req, res) => {
  try {
    const competency = await Competency.findById(req.params.competencyId).populate('skillsets');
    if (!competency) return res.status(404).json({ message: 'Competency not found' });
    res.json({ skillsets: competency.skillsets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/competencies/:competencyId/skillsets', async (req, res) => {
  try {
    const { competencyId } = req.params;
    const { skillsetId } = req.body;

    const skillset = await Skillset.findById(skillsetId);
    if (!skillset) return res.status(404).json({ message: 'Skillset not found' });

    const competency = await Competency.findById(competencyId);
    if (!competency) return res.status(404).json({ message: 'Competency not found' });

    if (competency.skillsets.includes(skillsetId)) {
      return res.status(400).json({ message: 'This skillset is already linked to the competency' });
    }

    competency.skillsets.push(skillsetId);
    await competency.save();

    res.status(201).json({ message: 'Skillset linked successfully', skillset });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/skillsets/:id', async (req, res) => {
  try {
    const skillsetId = req.params.id;
    const updatedData = req.body;

    const originalSkillset = await Skillset.findById(skillsetId);
    if (!originalSkillset) return res.status(404).json({ message: 'Skillset not found' });

    if (updatedData.skillset && updatedData.skillset !== originalSkillset.skillset) {
      const existingSkillset = await Skillset.findOne({ skillset: updatedData.skillset });
      if (existingSkillset && existingSkillset._id.toString() !== skillsetId) {
        return res.status(400).json({ message: 'A skillset with this name already exists' });
      }
    }

    const skillset = await Skillset.findByIdAndUpdate(skillsetId, updatedData, { new: true });
    res.json({ skillset });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A skillset with this name already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Remove Skillset from Competency
app.delete('/api/competencies/:competencyId/skillsets/:skillsetId', async (req, res) => {
  try {
    const { competencyId, skillsetId } = req.params;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(competencyId)) {
      return res.status(400).json({ message: 'Invalid competency ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(skillsetId)) {
      return res.status(400).json({ message: 'Invalid skillset ID' });
    }

    // Find the competency
    const competency = await Competency.findById(competencyId);
    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check if the skillset exists in the competency
    const skillsetIndex = competency.skillsets.findIndex(
      id => id.toString() === skillsetId.toString()
    );
    if (skillsetIndex === -1) {
      return res.status(400).json({ message: 'Skillset not found in this competency' });
    }

    // Remove the skillset from the competency's skillsets array
    competency.skillsets.splice(skillsetIndex, 1);
    await competency.save();

    res.status(200).json({ 
      message: 'Skillset removed from competency successfully', 
      competency 
    });
  } catch (error) {
    console.error('Error removing skillset from competency:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Question Routes
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { question } = req.body;
    const existingQuestion = await Question.findOne({ question });
    if (existingQuestion) return res.status(400).json({ message: 'A question with this text already exists' });

    const newQuestion = new Question(req.body);
    await newQuestion.save();
    res.status(201).json({ question: newQuestion });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A question with this text already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.get('/api/skillsets/:skillsetId/questions', async (req, res) => {
  try {
    const skillset = await Skillset.findById(req.params.skillsetId).populate('questions');
    if (!skillset) return res.status(404).json({ message: 'Skillset not found' });
    res.json({ questions: skillset.questions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/skillsets/:skillsetId/questions', async (req, res) => {
  try {
    const { skillsetId } = req.params;
    const { questionId } = req.body;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const skillset = await Skillset.findById(skillsetId);
    if (!skillset) return res.status(404).json({ message: 'Skillset not found' });

    if (skillset.questions.includes(questionId)) {
      return res.status(400).json({ message: 'This question is already linked to the skillset' });
    }

    skillset.questions.push(questionId);
    await skillset.save();

    res.status(201).json({ message: 'Question linked successfully', question });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    const updatedData = req.body;

    const originalQuestion = await Question.findById(questionId);
    if (!originalQuestion) return res.status(404).json({ message: 'Question not found' });

    if (updatedData.question && updatedData.question !== originalQuestion.question) {
      const existingQuestion = await Question.findOne({ question: updatedData.question });
      if (existingQuestion && existingQuestion._id.toString() !== questionId) {
        return res.status(400).json({ message: 'A question with this text already exists' });
      }
    }

    const question = await Question.findByIdAndUpdate(questionId, updatedData, { new: true });
    res.json({ question });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A question with this text already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    await Skillset.updateMany(
      { questions: question._id },
      { $pull: { questions: question._id } }
    );

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/skillsets/:skillsetId', async (req, res) => {
  try {
    const skillset = await Skillset.findById(req.params.skillsetId);
    if (!skillset) return res.status(404).json({ message: 'Skillset not found' });
    res.json({ skillset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/competencies', async (req, res) => {
  try {
    const { skillsetId } = req.query;
    if (skillsetId) {
      const competencies = await Competency.find({ skillsets: skillsetId });
      res.json({ competencies });
    } else {
      const competencies = await Competency.find();
      res.json({ competencies });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test Routes
app.get('/api/projects/:projectId/tests', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('tests');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json({ tests: project.tests || [] });
  } catch (error) {
    console.error('Error fetching project tests:', error);
    res.status(500).json({ message: 'Server error while fetching tests' });
  }
});

app.post('/api/tests', upload.none(), async (req, res) => {
  try {
    const {
      testName, activityType, description, date, time, prepare, present,
      require, expect, testpaper, projectId
    } = req.body;

    console.log('Received data:', req.body);

    if (!testName || !activityType || !prepare || !present || !require || !expect || !testpaper || !projectId) {
      return res.status(400).json({ message: 'All required fields (except date and time) must be provided' });
    }

    const newTest = new Test({
      testName,
      activityType,
      description,
      date: date || null, // Default to null if not provided
      time: time || null, // Default to null if not provided
      prepare: parseInt(prepare),
      present: parseInt(present),
      require,
      expect,
      testpaper,
    });

    await newTest.save();

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.tests = project.tests || [];
    project.tests.push(newTest._id);
    if (!project.testId) project.testId = newTest._id;
    await project.save();

    res.status(201).json({ message: 'Activity created successfully', test: newTest });
  } catch (error) {
    console.error('Error in POST /tests:', error);
    res.status(400).json({ message: error.message });
  }
});

// GET /api/tests/:id (No Authentication)
app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json({ test });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/tests/:id (No Authentication)
app.put('/api/tests/:id', async (req, res) => {
  try {
    const {
      testName, activityType, description, date, time, prepare, present,
      require, expect, testpaper
    } = req.body;

    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id,
      {
        testName,
        activityType,
        description,
        date,
        time,
        prepare: parseInt(prepare),
        present: parseInt(present),
        require,
        expect,
        testpaper,
      },
      { new: true, runValidators: true }
    );
    if (!updatedTest) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json({ message: 'Test updated', test: updatedTest });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/projects/:projectId/tests/:testId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.tests = project.tests.filter(testId => testId.toString() !== req.params.testId);
    await project.save();
    res.status(200).json({ message: 'Test removed from project' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json({ message: 'Test deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Activity Routes
app.get('/api/activities', async (req, res) => {
  try {
    const activities = await Activity.find();
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Activity name is required' });

    const activity = new Activity({ name });
    await activity.save();

    res.status(201).json({ message: 'Activity created', activity });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// In your Express app
// server.js
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/projects/:projectId/add-pending-leadassessor', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { leadAssessorId, eventDate, eventTime } = req.body;

    // Validate input
    if (!leadAssessorId || !eventDate || !eventTime) {
      return res.status(400).json({ message: 'leadAssessorId, eventDate, and eventTime are required' });
    }

    // Check if projectId is valid
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if leadAssessorId is valid
    if (!mongoose.Types.ObjectId.isValid(leadAssessorId)) {
      return res.status(400).json({ message: 'Invalid leadAssessorId' });
    }

    // Check for duplicates
    if (project.selectedLeadassessor.includes(leadAssessorId) || project.pendingLeadAssessors.includes(leadAssessorId)) {
      return res.status(400).json({ message: 'Lead Assessor already assigned or pending' });
    }

    // Add to pending list
    project.pendingLeadAssessors.push(leadAssessorId);
    await project.save();

    // Create notification
    const notification = new Notification({
      recipientId: leadAssessorId,
      message: `You have been invited to be a Lead Assessor for project: ${project.projectName || 'Unnamed Project'}. Please confirm.`,
      projectId,
      eventDate: new Date(eventDate), // Ensure valid Date object
      eventTime,
    });
    await notification.save();

    res.status(200).json({ message: 'Lead Assessor added as pending, notification sent', project });
  } catch (error) {
    console.error('Error adding pending Lead Assessor:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      projectId: req.params.projectId,
    });
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Confirm Notification (update for all roles)
app.put('/api/notifications/:notificationId/confirm', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId).populate('projectId');
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const project = notification.projectId;
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'Notification already processed' });
    }

    notification.status = 'accepted';
    await notification.save();

    const userId = notification.recipientId;
    if (project.pendingLeadAssessors.includes(userId)) {
      project.pendingLeadAssessors = project.pendingLeadAssessors.filter(id => id !== userId);
      project.selectedLeadassessor.push(userId);
    } else if (project.pendingAssessors.includes(userId)) {
      project.pendingAssessors = project.pendingAssessors.filter(id => id !== userId);
      project.selectedAssessor.push(userId);
    } else if (project.pendingCandidates.includes(userId)) {
      project.pendingCandidates = project.pendingCandidates.filter(id => id !== userId);
      project.selectedCandidates.push(userId);
    }
    await project.save();

    res.status(200).json({ message: 'Notification confirmed', project });
  } catch (error) {
    console.error('Error confirming notification:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// app.post('/api/calendar', async (req, res) => {
//   try {
//     const { userId, projectId, eventDate, eventTime, title } = req.body;

//     // Validate input
//     if (!userId || !projectId || !eventDate || !eventTime || !title) {
//       return res.status(400).json({ message: 'All fields (userId, projectId, eventDate, eventTime, title) are required' });
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ message: 'Invalid user ID' });
//     }
//     if (!mongoose.Types.ObjectId.isValid(projectId)) {
//       return res.status(400).json({ message: 'Invalid project ID' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const project = await Project.findById(projectId);
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }

//     const calendarEvent = new Calendar({
//       userId,
//       projectId,
//       eventDate: new Date(eventDate), // Ensure valid Date object
//       eventTime,
//       title
//     });

//     await calendarEvent.save();

//     res.status(201).json({ message: 'Calendar event created successfully', event: calendarEvent });
//   } catch (error) {
//     console.error('Error creating calendar event:', error);
//     res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// });

// Get Calendar Events for a User (New Endpoint)
// app.get('/api/calendar/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const events = await Calendar.find({ userId }).populate('projectId', 'projectName');
//     res.status(200).json(events);
//   } catch (error) {
//     console.error('Error fetching calendar events:', error);
//     res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// });

// Reject Lead Assessor (Optional)
app.put('/api/notifications/:notificationId/reject', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const project = await Project.findById(notification.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'Notification already processed' });
    }

    notification.status = 'rejected';
    await notification.save();

    project.pendingLeadAssessors = project.pendingLeadAssessors.filter(id => id !== notification.recipientId);
    await project.save();

    res.status(200).json({ message: 'Lead Assessor rejected', project });
  } catch (error) {
    console.error('Error rejecting Lead Assessor:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get Notifications for a User
// In server.js, replace the existing /api/notifications/:userId endpoint
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const notifications = await Notification.find({ recipientId: userId })
      .populate('projectId', 'projectName')
      .sort({ createdAt: -1 }); // Add sorting
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Updated Generic Endpoint for Assessors and Candidates
app.put('/api/projects/:projectId/add-user-notification', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, userType, eventDate, eventTime } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    let pendingField, selectedField;
    switch (userType) {
      case 'assessor':
        pendingField = 'pendingAssessors';
        selectedField = 'selectedAssessor';
        break;
      case 'candidate':
        pendingField = 'pendingCandidates';
        selectedField = 'selectedCandidates';
        break;
      default:
        return res.status(400).json({ message: 'Invalid user type' });
    }

    if (project[selectedField].includes(userId) || project[pendingField].includes(userId)) {
      return res.status(400).json({ message: `${userType} already assigned or pending` });
    }

    project[pendingField].push(userId);
    await project.save();

    const roleText = userType === 'assessor' ? 'an Assessor' : 'a Candidate';
    const notification = new Notification({
      recipientId: userId,
      message: `You have been invited to be ${roleText} for project: ${project.projectName}. Please confirm.`,
      projectId,
      eventDate: eventDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      eventTime: eventTime || "09:00",
    });
    await notification.save();

    res.status(200).json({ message: `${userType} added as pending, notification sent`, project });
  } catch (error) {
    console.error(`Error adding ${userType} with notification:`, error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already in use' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
});

app.put('/api/tests/:id/attend', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const candidateObjectId = new mongoose.Types.ObjectId(candidateId);
    const existingAttendee = test.attendees.find(att => att.candidate.equals(candidateObjectId));
    if (!existingAttendee) {
      test.attendees.push({ candidate: candidateObjectId, startTime: new Date() });
    }
    if (!test.attended.some(id => id.equals(candidateObjectId))) {
      test.attended.push(candidateObjectId);
    }
    await test.save();

    res.status(200).json({ message: 'Attendance marked successfully', test });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.put('/api/tests/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateId, remainingTime } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const candidateObjectId = new mongoose.Types.ObjectId(candidateId);
    const attendeeIndex = test.attendees.findIndex(att => 
      att.candidate.equals(candidateObjectId)
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'Candidate not found in attendees' });
    }

    // Update the remainingTime for this attendee
    if (remainingTime !== undefined) {
      test.attendees[attendeeIndex].remainingTime = remainingTime;
    }

    // Optionally, you could mark them as "left" without removing them
    // test.attendees[attendeeIndex].status = 'offline'; // If you add a status field

    await test.save();

    res.status(200).json({ 
      message: 'Candidate timer updated', 
      test 
    });
  } catch (error) {
    console.error('Error updating candidate timer:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Add this after the /api/tests/:id/leave endpoint in server.js
app.put('/api/tests/:testId/stop-timer', async (req, res) => {
  try {
    const { testId } = req.params;
    const { candidateId } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID' });
    }

    // Find the test
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Find the attendee
    const attendee = test.attendees.find(
      (att) => (att.candidate._id || att.candidate).toString() === candidateId
    );
    if (!attendee) {
      return res.status(404).json({ message: 'Candidate not found in test attendees' });
    }

    // Check if timer is already stopped
    if (attendee.timerStopped) {
      return res.status(400).json({ message: 'Timer is already stopped for this candidate' });
    }

    // Update timer status
    attendee.timerStopped = true;
    attendee.remainingTime = 0; // Reset remaining time
    await test.save();

    res.status(200).json({ message: 'Timer stopped successfully' });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});




// Updated Send Invitations Endpoint
app.post('/api/register', upload.single('cv'), async (req, res) => {
  try {
    const { name, age, company, email, countryCode, phone, password, role, projectId } = req.body;
    const cv = req.file ? req.file.path : undefined;

    if (!name || !email || !countryCode || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, country code, phone, and password are required' });
    }

    const validRoles = ['Candidate', 'Assessor', 'Leadassessor', 'Admin', 'Client'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check if user already exists by email
    const user = await User.findOne({ email });
    if (user) {
      // If user exists, return a message without updating
      return res.status(409).json({ 
        message: `User with email ${email} already exists.` 
      });
    }

    // Create new user if no existing user found
    const newUser = new User({
      name,
      age,
      company,
      email,
      countryCode,
      phone,
      password,
      role: role || 'Candidate',
      cv,
    });
    await newUser.save();

    // Add user to project if projectId is provided (for Candidates or Clients)
    if (projectId && (role === 'Candidate' || role === 'Client')) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      const targetField = role === 'Candidate' ? 'selectedCandidates' : 'selectedClients';
      if (!project[targetField].includes(newUser._id)) {
        project[targetField].push(newUser._id);
        await project.save();
      }
    }

    res.status(201).json({ 
      message: 'User created and registered successfully', 
      user: newUser 
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already registered' });
    } else {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
});

// Replace your existing endpoint with this updated version
// Send Invitations Endpoint (No Hashing)
app.post('/api/projects/:projectId/send-invitations', async (req, res) => {
  const { projectId } = req.params;
  const { invitees, schedules, resend = false } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return res.status(400).json({ message: 'No users provided to invite' });
    }

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'No activity schedules provided' });
    }

    // Validate and normalize schedules
    const formattedSchedules = schedules.map((schedule, index) => {
      const { eventDate, eventTime } = schedule;

      if (!eventDate || !eventTime) {
        throw new Error(`Schedule at index ${index} is missing eventDate or eventTime`);
      }

      const dateStr = typeof eventDate === 'string' ? eventDate : eventDate.toString().slice(0, 10);
      if (!moment(dateStr, 'YYYY-MM-DD', true).isValid()) {
        throw new Error(`Invalid eventDate format at index ${index}: ${eventDate}`);
      }

      if (!moment(eventTime, 'HH:mm', true).isValid()) {
        throw new Error(`Invalid eventTime format at index ${index}: ${eventTime}`);
      }

      return { eventDate: dateStr, eventTime };
    });

    const notifications = [];
    const loginLink = 'http://localhost:3000/';

    const allInvitees = [
      ...(project.selectedLeadassessor || []).map(id => ({ id, role: 'Leadassessor' })),
      ...(project.selectedAssessor || []).map(id => ({ id, role: 'Assessor' })),
      ...(project.selectedCandidates || []).map(id => ({ id, role: 'Candidate' })),
      ...(project.selectedClients || []).map(id => ({ id, role: 'Client' })),
      ...invitees,
    ];

    for (const invitee of allInvitees) {
      let user;
      let passwordToSend;

      if (invitee.id) {
        user = await User.findById(invitee.id);
        if (!user) {
          console.warn(`User not found: ${invitee.id}, skipping`);
          continue;
        }
        passwordToSend = user.password;
      } else if (invitee.email) {
        user = await User.findOne({ email: invitee.email });
        if (!user && invitee.email) {
          if (!invitee.password) {
            console.warn(`No password provided for new user ${invitee.email}, skipping`);
            continue;
          }
          passwordToSend = invitee.password;
          user = new User({
            email: invitee.email,
            name: invitee.name || 'User',
            password: passwordToSend,
            role: invitee.role || 'Candidate',
            countryCode: '+971',
            phone: `000${Math.floor(1000000 + Math.random() * 9000000)}`,
            age: '30',
          });
          await user.save();
        } else if (user) {
          passwordToSend = user.password;
        }
      }

      if (!user) {
        console.warn(`User not found or created: ${invitee.id || invitee.email}, skipping`);
        continue;
      }

      // Check for existing notification
      if (!resend) {
        const existingNotifications = await Notification.find({
          recipientId: user._id,
          projectId,
          status: { $in: ['pending', 'sent'] },
        });

        // Check if any existing notification has the same schedules
        let hasMatchingSchedules = false;
        for (const existingNotification of existingNotifications) {
          const existingSchedules = existingNotification.schedules.map(s => ({
            eventDate: moment(s.eventDate).format('YYYY-MM-DD'),
            eventTime: s.eventTime,
          }));
          const newSchedules = formattedSchedules.map(s => ({
            eventDate: s.eventDate,
            eventTime: s.eventTime,
          }));

          // Check if schedules are identical
          const schedulesMatch = existingSchedules.length === newSchedules.length &&
            existingSchedules.every((es, i) =>
              es.eventDate === newSchedules[i].eventDate &&
              es.eventTime === newSchedules[i].eventTime
            );

          if (schedulesMatch) {
            hasMatchingSchedules = true;
            console.log(`Notification with same schedules exists for ${user.email}, skipping`);
            break;
          }
        }

        if (hasMatchingSchedules) {
          continue;
        }
      }

      const roleText = invitee.role === 'Leadassessor' ? 'Lead Assessor' : invitee.role;
      const message = `You have been invited to be a ${roleText} for project: ${project.projectName || 'Unnamed Project'}.`;
      const notification = new Notification({
        recipientId: user._id,
        projectId,
        message,
        schedules: formattedSchedules.map(s => ({
          eventDate: new Date(`${s.eventDate}T${s.eventTime}:00`),
          eventTime: s.eventTime,
        })),
        status: 'pending',
        role: invitee.role,
      });
      await notification.save();

      const googleCalendarLinks = formattedSchedules.map(schedule => {
        const startDate = new Date(`${schedule.eventDate}T${schedule.eventTime}:00`);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid date constructed: ${schedule.eventDate}T${schedule.eventTime}:00`);
        }
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
        const startUTC = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endUTC = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const eventTitle = encodeURIComponent(`${roleText} Meeting for ${project.projectName || 'Unnamed Project'}`);
        const details = encodeURIComponent(`You are invited as a ${roleText}. Login: ${loginLink}`);
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startUTC}/${endUTC}&details=${details}`;
      });

      const mailOptions = {
        from: 'shameem@qaitas.com',
        to: user.email,
        subject: `Invitation to ${project.projectName || 'Unnamed Project'}`,
        html: `
          <h3>Hello ${user.name || 'User'},</h3>
          <p>You have been invited to participate as a <strong>${roleText}</strong> in the project: <strong>${project.projectName || 'Unnamed Project'}</strong>.</p>
          <p><strong>Your Login Credentials:</strong></p>
          <p>Email: ${user.email}</p>
          <p>Password: ${passwordToSend}</p>
          <p><strong>Login Here:</strong> <a href="${loginLink}">${loginLink}</a></p>
          <p><strong>Event Schedule:</strong></p>
          <ul>
            ${formattedSchedules.map((s, index) => `
              <li>
                ${new Date(`${s.eventDate}T${s.eventTime}:00`).toLocaleDateString()} at ${s.eventTime}
                <a href="${googleCalendarLinks[index]}" target="_blank">Add to Google Calendar</a>
              </li>
            `).join('')}
          </ul>
          <p>Please log in to confirm your participation.</p>
          <p>Best regards,<br/>Your Project Team</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        notification.status = 'sent';
        await notification.save();
        notifications.push(notification);
      } catch (emailError) {
        console.error(`Email failed for ${user.email}:`, emailError);
        notification.status = 'failed';
        await notification.save();
        notifications.push(notification);
      }
    }

    res.status(200).json({ message: 'Invitations processed successfully', notifications });
  } catch (error) {
    console.error('Error in send-invitations:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fetch Notifications by Project ID
app.get('/api/notifications/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const notifications = await Notification.find({ projectId })
      .populate('projectId', 'companyName projectName')
      .populate('recipientId', 'name email role');
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/projects/:projectId/full-details', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('selectedLeadassessor', 'name email role')
      .populate('selectedAssessor', 'name email role')
      .populate('selectedCandidates', 'name email role countryCode phone age company') // Updated
      .populate('selectedClients', 'name email role')
      .populate('candidateBatches.candidates', 'name email role countryCode phone age company') // Updated for consistency
      .populate('groups.assessor', 'name email role')
      .populate('groups.candidates', 'name email role countryCode phone age company') // Updated for consistency
      .populate({ path: 'tests' })
      .populate({
        path: 'competencies',
        populate: { path: 'skillsets', populate: { path: 'questions' } },
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error('❌ Error fetching full project details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/groups', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { groups } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Validate: Each candidate in only one group
    const allCandidates = groups.flatMap(g => g.candidates);
    const uniqueCandidates = new Set(allCandidates);
    if (uniqueCandidates.size !== allCandidates.length) {
      return res.status(400).json({ message: 'Each candidate can only be in one group' });
    }

    // Validate: Each group has one assessor
    for (const group of groups) {
      if (!group.assessor) {
        return res.status(400).json({ message: 'Each group must have one assessor' });
      }
    }

    project.groups = groups.map(group => ({
      assessor: group.assessor,
      candidates: group.candidates || [],
      groupName: group.groupName || `Group ${Date.now()}`
    }));

    await project.save();
    const updatedProject = await Project.findById(projectId)
      .populate('groups.assessor', 'name email role')
      .populate('groups.candidates', 'name email role');

    res.status(200).json({ message: 'Groups updated successfully', project: updatedProject });
  } catch (error) {
    console.error('Error updating groups:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// server.js or routes/projects.js
app.get("/api/projects/assessor/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const projects = await Project.find({
      $or: [
        { selectedAssessor: userId },
        { "groups.assessor": userId },
      ],
    })
      .populate("selectedAssessor", "name email")
      .populate("selectedLeadassessor", "name email")
      .populate("groups.assessor", "name email")
      .populate("groups.candidates", "name email")
      .populate("selectedCandidates", "name email");

    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error fetching assessor projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get('/api/tests/:testId', async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate('attendees.candidate', 'name email role')
      .populate('attended', 'name email role');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    // Ensure no null entries from failed population
    test.attendees = test.attendees.filter(a => a.candidate);
    test.attended = test.attended.filter(a => a);
    res.status(200).json({ test });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/questions/marks - Save marks to Marks collection
app.post('/api/questions/marks', async (req, res) => {
  const { projectId, skillsetId, marks, userId } = req.body;

  if (!projectId || !skillsetId || !marks || !userId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify assessor authorization
    const isAssessor = project.groups.some(group => group.assessor.toString() === userId);
    if (!isAssessor) {
      return res.status(403).json({ message: 'Unauthorized: Not an assessor for this project' });
    }

    // Normalize and validate marks based on scoring mechanism
    const scoringMechanism = project.scoringMechanism || 'normal';
    const normalizedMarks = {};
    for (const questionId in marks) {
      normalizedMarks[questionId] = {};
      for (const candidateId in marks[questionId]) {
        let mark = marks[questionId][candidateId];
        if (scoringMechanism === 'normal') {
          // Convert boolean to number (true -> 1, false -> 0)
          if (typeof mark !== 'boolean') {
            return res.status(400).json({ message: 'Marks must be boolean for normal scoring' });
          }
          normalizedMarks[questionId][candidateId] = mark ? 1 : 0;
        } else if (scoringMechanism === 'weighted3') {
          mark = parseInt(mark);
          if (isNaN(mark) || mark < 0 || mark > 3) {
            return res.status(400).json({ message: 'Marks must be integers between 0 and 3 for weighted3 scoring' });
          }
          normalizedMarks[questionId][candidateId] = mark;
        } else if (scoringMechanism === 'weighted5') {
          mark = parseInt(mark);
          if (isNaN(mark) || mark < 0 || mark > 5) {
            return res.status(400).json({ message: 'Marks must be integers between 0 and 5 for weighted5 scoring' });
          }
          normalizedMarks[questionId][candidateId] = mark;
        }
      }
    }

    // Check if marks already exist for this project, skillset, and assessor
    let markDoc = await Marks.findOne({ projectId, skillsetId, assessorId: userId });
    if (markDoc) {
      // Update existing marks
      markDoc.marks = normalizedMarks;
      markDoc.updatedAt = Date.now();
    } else {
      // Create new marks document
      markDoc = new Marks({
        projectId,
        skillsetId,
        assessorId: userId,
        marks: normalizedMarks,
      });
    }

    await markDoc.save();
    res.status(200).json({ message: 'Marks saved successfully' });
  } catch (error) {
    console.error('Error saving marks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/marks/project/:projectId', async (req, res) => {
  const { projectId } = req.params;

  try {
    const marksDocs = await Marks.find({ projectId }).populate('assessorId', 'name');
    if (!marksDocs.length) {
      return res.status(404).json({ message: 'No marks found for this project' });
    }

    // Fetch all questions
    const questions = await Question.find({});
    const questionMap = new Map(questions.map(q => [q._id.toString(), { question: q.question, questionArabic: q.questionArabic }]));

    // Extract all candidate IDs from marks
    const candidateIds = new Set();
    marksDocs.forEach(doc => {
      const marksMap = doc.marks instanceof Map ? doc.marks : new Map(Object.entries(doc.marks));
      for (const [, candidateMarks] of marksMap.entries()) {
        const innerMap = candidateMarks instanceof Map ? candidateMarks : new Map(Object.entries(candidateMarks));
        for (const [candidateId] of innerMap.entries()) {
          candidateIds.add(candidateId);
        }
      }
    });

    // Fetch candidate names
    const candidates = await User.find({ _id: { $in: Array.from(candidateIds) } }, 'name');
    const candidateMap = new Map(candidates.map(c => [c._id.toString(), c.name]));

    // Process marks data
    const results = marksDocs.map(doc => {
      const marksArray = [];
      const marksMap = doc.marks instanceof Map ? doc.marks : new Map(Object.entries(doc.marks));
      for (const [questionId, candidateMarks] of marksMap.entries()) {
        const innerMap = candidateMarks instanceof Map ? candidateMarks : new Map(Object.entries(candidateMarks));
        for (const [candidateId, mark] of innerMap.entries()) {
          const questionData = questionMap.get(questionId) || { question: 'Unknown', questionArabic: 'غير معروف' };
          marksArray.push({
            questionId,
            question: questionData.question,
            questionArabic: questionData.questionArabic,
            candidateId,
            candidateName: candidateMap.get(candidateId) || 'Unknown',
            mark,
            assessorId: doc.assessorId._id.toString(),
            assessorName: doc.assessorId.name || 'Unknown',
            skillsetId: doc.skillsetId.toString()
          });
        }
      }
      return { projectId: doc.projectId, marks: marksArray };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching project marks:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add this route
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Existing notifications endpoint (already added previously)
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('projectId', 'projectName')
      .populate('recipientId', 'name email role');
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/register/admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password (assuming you’re using bcrypt)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'Admin', // Set role to 'admin'
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin registered successfully', user: { id: newAdmin._id, name, email, role: 'admin' } });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/notifications/:notificationId/schedule - Delete a specific schedule from a notification
app.delete('/api/notifications/:notificationId/schedule', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { eventDate, eventTime } = req.body;

    console.log('Delete Request Body:', { notificationId, eventDate, eventTime }); // Debug log

    if (!eventDate || !eventTime) {
      return res.status(400).json({ message: 'eventDate and eventTime are required' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    console.log('Existing Schedules:', notification.schedules); // Debug log

    const scheduleIndex = notification.schedules.findIndex((s) => {
      const formattedEventDate = moment(s.eventDate).format('YYYY-MM-DD');
      const formattedReqDate = moment(eventDate).format('YYYY-MM-DD');
      const timeMatch = s.eventTime === eventTime;
      console.log(`Comparing: ${formattedEventDate} === ${formattedReqDate} && ${s.eventTime} === ${eventTime}`); // Debug log
      return formattedEventDate === formattedReqDate && timeMatch;
    });

    if (scheduleIndex === -1) {
      return res.status(404).json({ message: 'Schedule not found in this notification' });
    }

    notification.schedules.splice(scheduleIndex, 1);
    await notification.save();

    console.log('Updated Notification:', notification); // Debug log

    res.status(200).json({ message: 'Schedule deleted successfully', notification });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Create or Update Calendar Entry
// Replace existing calendar routes with these

// Create or Update Calendar Entry
app.post('/api/calendar', async (req, res) => {
  try {
    const { projectId, title, event } = req.body;

    if (!projectId || !title || !event || !Array.isArray(event.users) || !Array.isArray(event.schedules)) {
      return res.status(400).json({ message: 'projectId, title, and event (with users and schedules) are required' });
    }

    const calendarEntry = new Calendar({
      projectId,
      title,
      event,
    });

    await calendarEntry.save();
    res.status(201).json({ message: 'Calendar entry created successfully', calendar: calendarEntry });
  } catch (error) {
    console.error('Error creating calendar entry:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get Calendar Entry by Project ID


// Get All Calendar Entries
app.get('/api/calendar', async (req, res) => {
  try {
    const calendars = await Calendar.find()
      .populate('projectId', 'projectName')
      .populate('event.users.userId', 'name email');

    // Filter out invalid users
    const cleanedCalendars = calendars.map((calendar) => {
      calendar.event.users = calendar.event.users.filter((u) => u.userId !== null);
      return calendar;
    });

    res.status(200).json(cleanedCalendars);
  } catch (error) {
    console.error('Error fetching all calendars:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Update Calendar Entry by Project ID
// Update Calendar Entry by Project ID
// In server.js

app.put('/api/calendar/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { event } = req.body;

  try {
    // Deduplicate users by userId
    const userMap = new Map();
    (event.users || []).forEach(user => {
      userMap.set(user.userId.toString(), {
        userId: user.userId,
        role: user.role,
      });
    });
    const uniqueUsers = Array.from(userMap.values());

    // Update calendar with deduplicated users
    const updatedCalendar = await Calendar.findOneAndUpdate(
      { projectId },
      {
        $set: {
          'event.users': uniqueUsers,
          'event.schedules': event.schedules || [],
        },
      },
      { new: true, upsert: true } // Create if it doesn't exist
    );

    res.json(updatedCalendar);
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({ message: 'Server error while updating calendar' });
  }
});

// NEW: Get Calendar Entry by Project ID
app.get('/api/calendar/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const calendar = await Calendar.findOne({ projectId })
      .populate('projectId', 'projectName')
      .populate('event.users.userId', 'name email');

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar entry not found for this project' });
    }

    // Filter out any invalid user references
    calendar.event.users = calendar.event.users.filter(u => u.userId !== null);

    res.status(200).json(calendar);
  } catch (error) {
    console.error('Error fetching calendar by project:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Existing: Get Calendar Events for a User
app.get('/api/calendar/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const calendars = await Calendar.find({ "event.users.userId": userId })
      .populate('projectId', 'projectName')
      .populate('event.users.userId', 'name email');

    // Filter out invalid users
    const cleanedCalendars = calendars.map(calendar => {
      calendar.event.users = calendar.event.users.filter(u => u.userId !== null);
      return calendar;
    });

    // Always return an array, even if empty (no 404)
    res.status(200).json(cleanedCalendars);
  } catch (error) {
    console.error('Error fetching user calendar events:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the Registration API');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});



