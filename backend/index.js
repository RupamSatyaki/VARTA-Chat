const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
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
const server = http.createServer(app); // Create HTTP server for Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// 4. Models Initialization
console.log('⌛ Loading Models...');
const User = require('./models/User');
const Message = require('./models/Message');
console.log('✔ All models successfully loaded');

// 5. Controllers Initialization
console.log('⌛ Initializing Controllers...');
// Controller logic loaded via routes
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

// Register User Routes
app.use('/api/users', require('./routes/userRoutes'));
console.log('   - Route initialized: /api/users (User Profile)');

// Register Message Routes
app.use('/api/messages', require('./routes/messageRoutes'));
console.log('   - Route initialized: /api/messages (Messaging System)');

// Register Chat Routes
app.use('/api/chats', require('./routes/chatRoutes'));
console.log('   - Route initialized: /api/chats (Chat System)');

console.log('✔ All API routes successfully initialized');

// 8. Socket.io Logic
console.log('⌛ Initializing Socket.io...');

io.on('connection', (socket) => {
  console.log(`📡 New client connected: ${socket.id}`);

  // Setup user session
  socket.on('setup', (userData) => {
    socket.join(userData._id);
    console.log(`👤 User joined room: ${userData._id}`);
    socket.emit('connected');
  });

  // Join a private chat room
  socket.on('join-chat', (room) => {
    socket.join(room);
    console.log(`💬 User joined chat room: ${room}`);
  });

  // Handle new message
  socket.on('new-message', async (newMessageReceived) => {
    const { senderId, receiverId, content, type } = newMessageReceived;

    if (!senderId || !receiverId || !content) {
      return console.log('❌ Invalid message data received');
    }

    try {
      // Save message to database
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content: content,
        type: type || 'text',
        status: 'sent'
      });

      console.log(`💾 Message saved to DB: ${message._id}`);

      // Broadcast to the receiver's room
      socket.in(receiverId).emit('message-received', {
        ...newMessageReceived,
        _id: message._id,
        createdAt: message.createdAt
      });
      
      console.log(`📩 Message relayed to: ${receiverId}`);
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('📡 Client disconnected');
  });
});

console.log('✔ Socket.io successfully initialized');

// Basic Route
app.get('/', (req, res) => {
  res.send('VARTA Backend Server is running with Socket.io...');
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
