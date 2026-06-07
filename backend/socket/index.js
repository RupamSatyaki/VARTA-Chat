const { Server } = require('socket.io');
const registerChatHandlers = require('./chatHandler');

// Track online users: { userId: socketId }
const onlineUsers = new Map();

/**
 * Initialize Socket.io and register handlers
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`📡 New client connected: ${socket.id}`);

    // Setup user session
    socket.on('setup', (userData) => {
      if (!userData?._id) return;
      
      socket.join(userData._id);
      onlineUsers.set(userData._id, socket.id);
      
      console.log(`👤 User joined room: ${userData._id}`);
      
      // Notify everyone that this user is online
      io.emit('user-status-changed', {
        userId: userData._id,
        status: 'online'
      });

      // Send the current list of online users back to the connecting user
      socket.emit('get-online-users', Array.from(onlineUsers.keys()));
      
      socket.emit('connected');
    });

    // Register modular handlers
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      // Find the user ID associated with this socket
      let disconnectedUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        onlineUsers.delete(disconnectedUserId);
        console.log(`📡 User offline: ${disconnectedUserId}`);
        
        // Notify everyone that this user is offline
        io.emit('user-status-changed', {
          userId: disconnectedUserId,
          status: 'offline'
        });
      }
      
      console.log('📡 Client disconnected');
    });
  });

  return io;
};

module.exports = initSocket;
