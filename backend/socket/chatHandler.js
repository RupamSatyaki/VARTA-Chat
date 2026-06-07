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
        senderNumber: sender?.number,
        status: 'sent'
      });
      
      console.log(`📩 Message relayed to: ${receiverId}`);
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
    }
  };

  // Handle message delivered (Receiver got the message)
  const messageDelivered = async ({ messageId, senderId }) => {
    try {
      const message = await Message.findByIdAndUpdate(messageId, {
        status: 'delivered',
        deliveredAt: Date.now()
      }, { new: true });

      if (message) {
        // Notify the sender that the message was delivered
        socket.in(senderId).emit('message-status-updated', {
          messageId,
          chatId: message.chat,
          status: 'delivered'
        });
        console.log(`✔ Message ${messageId} marked as delivered`);
      }
    } catch (error) {
      console.error('❌ Error in message-delivered:', error.message);
    }
  };

  // Handle message seen (Receiver opened the chat)
  const messageSeen = async ({ chatId, senderId, receiverId }) => {
    try {
      // Mark all messages in this chat sent by 'senderId' to 'receiverId' as seen
      await Message.updateMany(
        { chat: chatId, sender: senderId, receiver: receiverId, status: { $ne: 'seen' } },
        { status: 'seen', seenAt: Date.now() }
      );

      // Notify the sender that their messages were read
      socket.in(senderId).emit('messages-seen', {
        chatId,
        receiverId // The person who read the messages
      });
      
      console.log(`✔ Messages in chat ${chatId} marked as seen by ${receiverId}`);
    } catch (error) {
      console.error('❌ Error in message-seen:', error.message);
    }
  };

  // Register events
  socket.on('join-chat', joinChat);
  socket.on('new-message', newMessage);
  socket.on('message-delivered', messageDelivered);
  socket.on('message-seen', messageSeen);
};
