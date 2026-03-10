require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); 

const app = express();

// ==========================================
// 1. MIDDLEWARE
// ==========================================
// CORS allows your React frontend (port 3000) to communicate with this backend (port 5000)
app.use(cors()); 
// Parses incoming JSON payloads
app.use(express.json()); 

// ==========================================
// 2. DATABASE CONNECTION
// ==========================================
// Initializes the MongoDB connection from your config/db.js file
connectDB(); 

// ==========================================
// 3. API ROUTES
// ==========================================

// Health Check Route
app.get('/', (req, res) => {
  res.send('Atlas Backend API is running smoothly...');
});

// Study Module: Fetch Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    // NOTE: Once we build the Mongoose Task model in Phase 5, this will become:
    // const tasks = await Task.find();
    
    // For now, returning mock data mapped to your current project milestones
    const tasks = [
      { 
        id: 1, 
        title: 'Submit OS Project Progress Proposal', 
        priority: 'High', 
        status: 'Pending' 
      },
      { 
        id: 2, 
        title: 'Coordinate UI integration with Harshith and Pranati', 
        priority: 'Medium', 
        status: 'In Progress' 
      },
      { 
        id: 3, 
        title: 'Review IT254 Web Technologies Syllabus', 
        priority: 'Low', 
        status: 'Pending' 
      }
    ];
    
    // Simulating an 800ms network delay to test the loading UI in React
    setTimeout(() => res.json(tasks), 800);

  } catch (error) {
    console.error("API Error fetching tasks:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ==========================================
// 4. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Atlas Server running on port ${PORT}`);
  console.log(`Lead Backend Engine initialized successfully.`);
});