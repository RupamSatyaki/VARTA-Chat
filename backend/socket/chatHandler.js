const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

/**
 * Chat-related Socket event handlers
 */
module.exports = (io, socket) => {
  
  // Join a private chat room
  const joinChat = (room) => {
    socket.join(room);
    console.log(`💬 User joined chat room: ${room}`);
  };

  // Handle new message
  const newMessage = async (newMessageReceived) => {
    const { senderId, receiverId, content, type, chatId } = newMessageReceived;

    if (!senderId || !receiverId || !content || !chatId) {
      return console.log('❌ Invalid message data received');
    }

    try {
      // Save message to database
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content: content,
        type: type || 'text',
        status: 'sent',
        chat: chatId,
      });

      console.log(`💾 Message saved to DB: ${message._id}`);

      // Update the chat document with the latest message
      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: message._id,
      });
      console.log(`🔄 Chat ${chatId} updated with latest message`);

      // Get sender details to include in the broadcast
      const sender = await User.findById(senderId);

      // Broadcast to the receiver's room
      socket.in(receiverId).emit('message-received', {
        ...newMessageReceived,
        _id: message._id,
        createdAt: message.createdAt,
        senderName: sender?.name,
        senderNumber: sender?.number
      });
      
      console.log(`📩 Message relayed to: ${receiverId}`);
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
    }
  };

  // Register events
  socket.on('join-chat', joinChat);
  socket.on('new-message', newMessage);
};
