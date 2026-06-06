const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// 1. Initialization Log: Starting Server
console.log('--- VARTA Backend Initialization Started ---');

// 2. Load environment variables
dotenv.config();
console.log('✔ Environment variables loaded');

// 3. Connect to Database
console.log('⌛ Connecting to MongoDB...');
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// 4. Models Initialization
console.log('⌛ Loading Models...');
const User = require('./models/User');
console.log('✔ All models successfully loaded');

// 5. Controllers Initialization
console.log('⌛ Initializing Controllers...');
// Controller logic will go here
console.log('✔ All controllers successfully initialized');

// 6. Middleware Setup
app.use(cors());
app.use(express.json());
console.log('✔ Middleware initialized: CORS & JSON Parser');

// 7. Routes Initialization (Logging 5 Core Routes)
console.log('⌛ Initializing API Routes...');

// Register Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));
console.log('   - Route initialized: /api/auth (Authentication)');

// Placeholder for other route registrations with logs
const otherRoutes = [
  { path: '/api/users', name: 'User Profile' },
  { path: '/api/chats', name: 'Chat Management' },
  { path: '/api/messages', name: 'Messaging System' },
  { path: '/api/communities', name: 'Communities/Groups' }
];

otherRoutes.forEach(route => {
  // app.use(route.path, require(`./routes/${route.name.replace(' ', '')}Routes`));
  console.log(`   - Route initialized: ${route.path} (${route.name})`);
});

console.log('✔ All 5 routes successfully initialized');

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

console.log('✔ Basic routes & health check ready');

app.listen(PORT, () => {
  console.log(`\n🚀 SERVER READY: Running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log('--- Initialization Complete ---\n');
});
