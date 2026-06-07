const { Server } = require('socket.io');
const registerChatHandlers = require('./chatHandler');

/**
 * Initialize Socket.io and register handlers
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all for development
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`📡 New client connected: ${socket.id}`);

    // Setup user session
    socket.on('setup', (userData) => {
      socket.join(userData._id);
      console.log(`👤 User joined room: ${userData._id}`);
      socket.emit('connected');
    });

    // Register modular handlers
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log('📡 Client disconnected');
    });
  });

  return io;
};

module.exports = initSocket;
