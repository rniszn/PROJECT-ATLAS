const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // The Fallback: If process.env is undefined due to the Windows bug, 
    // it automatically uses the hardcoded string on the right.
    const dbUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/atlas_db';
    
    const conn = await mongoose.connect(dbUri);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // Stop the server process if the database fails to connect
    process.exit(1); 
  }
};

module.exports = connectDB;