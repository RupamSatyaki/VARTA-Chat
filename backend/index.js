const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./socket');

// 1. Initialization Log: Starting Server
console.log('--- VARTA Backend Initialization Started ---');

// 2. Load environment variables
dotenv.config();
console.log('✔ Environment variables loaded');

// 3. Connect to Database
console.log('⌛ Connecting to MongoDB...');
connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.io

// 4. Initialize Socket.io
console.log('⌛ Initializing Socket.io...');
const io = initSocket(server);
console.log('✔ Socket.io successfully initialized');

const PORT = process.env.PORT || 5000;

// 5. Models Initialization
console.log('⌛ Loading Models...');
// Models are loaded here to ensure they are registered with Mongoose
require('./models/User');
require('./models/Message');
require('./models/Chat');
require('./models/Call');
console.log('✔ All models successfully loaded');

// 6. Middleware Setup
app.use(cors());
app.use(express.json());
console.log('✔ Middleware initialized: CORS & JSON Parser');

// 7. Routes Initialization
console.log('⌛ Initializing API Routes...');

// Register Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));
console.log('   - Route initialized: /api/auth (Authentication)');

// Register User Routes
app.use('/api/users', require('./routes/userRoutes'));
console.log('   - Route initialized: /api/users (User Profile)');

// Register Message Routes
app.use('/api/messages', require('./routes/messageRoutes'));
console.log('   - Route initialized: /api/messages (Messaging System)');

// Register Chat Routes
app.use('/api/chats', require('./routes/chatRoutes'));
console.log('   - Route initialized: /api/chats (Chat System)');

// Register Call Routes
app.use('/api/calls', require('./routes/callRoutes'));
console.log('   - Route initialized: /api/calls (Call History)');

// Register Status Routes
app.use('/api/status', require('./routes/statusRoutes'));
console.log('   - Route initialized: /api/status (Status/Stories)');

console.log('✔ All API routes successfully initialized');

// Basic Route
app.get('/', (req, res) => {
  res.send('VARTA Backend Server is running with Modular Socket.io...');
});

// Health check route
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    db_connected: mongoose.connection.readyState === 1,
    socket_connected: io.engine.clientsCount
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 SERVER READY: Running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log('--- Initialization Complete ---\n');
});
