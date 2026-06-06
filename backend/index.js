const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Placeholder
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.send('VARTA Backend Server is running...');
});

// Health check route
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    db_connected: mongoose.connection.readyState === 1
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
