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
    const { senderId, content, type, chatId } = newMessageReceived;

    if (!senderId || !content || !chatId) {
      return console.log('❌ Invalid message data received');
    }

    try {
      // Fetch the chat to get users
      const chat = await Chat.findById(chatId).populate("users", "_id");
      if (!chat) return console.log('❌ Chat not found');

      // Save message to database
      const message = await Message.create({
        sender: senderId,
        content: content,
        type: type || 'text',
        status: 'sent',
        chat: chatId,
        // For 1-on-1, receiver is the other user. For group, it can be null.
        receiver: chat.isGroupChat ? null : chat.users.find(u => u._id.toString() !== senderId.toString())?._id,
        readBy: [senderId] // Sender has obviously read their own message
      });

      console.log(`💾 Message saved to DB: ${message._id}`);

      // Update the chat document with the latest message
      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: message._id,
      });
      console.log(`🔄 Chat ${chatId} updated with latest message`);

      // Get sender details to include in the broadcast
      const sender = await User.findById(senderId);

      // Broadcast to all users in the chat except the sender
      chat.users.forEach(user => {
        if (user._id.toString() === senderId.toString()) return;

        socket.in(user._id.toString()).emit('message-received', {
          ...newMessageReceived,
          _id: message._id,
          createdAt: message.createdAt,
          senderName: sender?.name,
          senderNumber: sender?.number,
          status: 'sent'
        });
      });
      
      console.log(`📩 Message relayed to users in chat: ${chatId}`);
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
    }
  };

  // Handle message delivered (Receiver got the message)
  const messageDelivered = async ({ messageId, senderId }) => {
    try {
      // ONLY update to delivered if current status is 'sent'
      const message = await Message.findOneAndUpdate(
        { _id: messageId, status: 'sent' },
        { status: 'delivered', deliveredAt: Date.now() },
        { new: true }
      );

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
      // 1. Add the receiver to the readBy array for all messages they haven't read yet
      await Message.updateMany(
        { chat: chatId, sender: { $ne: receiverId }, readBy: { $ne: receiverId } },
        { $addToSet: { readBy: receiverId } }
      );

      // 2. For 1-on-1 chats, we still update the status to 'seen' for UI ticks
      if (senderId && receiverId) {
        await Message.updateMany(
          { chat: chatId, sender: senderId, receiver: receiverId, status: { $ne: 'seen' } },
          { status: 'seen', seenAt: Date.now() }
        );

        // Notify the sender that their messages were read (to update ticks to blue)
        socket.in(senderId).emit('messages-seen', {
          chatId,
          senderId,
          receiverId
        });
      } else {
        // For group chats, we broadcast to the room that someone read messages
        // (This can be used to update unread counts for that user on other devices)
        socket.to(chatId).emit('messages-seen', {
          chatId,
          receiverId
        });
      }

      // Notify the receiver that they read the messages (to sync unread counts across devices)
      socket.emit('messages-seen', {
        chatId,
        senderId,
        receiverId
      });
      
      console.log(`✔ Messages in chat ${chatId} marked as seen by ${receiverId}`);
    } catch (error) {
      console.error('❌ Error in message-seen:', error.message);
    }
  };

  // Handle typing status
  const typing = ({ chatId, receiverId }) => {
    if (receiverId) {
      socket.in(receiverId).emit('typing', { chatId, userId: socket.id });
    } else {
      socket.to(chatId).emit('typing', { chatId, userId: socket.id });
    }
  };

  const stopTyping = ({ chatId, receiverId }) => {
    if (receiverId) {
      socket.in(receiverId).emit('stop-typing', { chatId, userId: socket.id });
    } else {
      socket.to(chatId).emit('stop-typing', { chatId, userId: socket.id });
    }
  };

  // Register events
  socket.on('join-chat', joinChat);
  socket.on('new-message', newMessage);
  socket.on('message-delivered', messageDelivered);
  socket.on('message-seen', messageSeen);
  socket.on('typing', typing);
  socket.on('stop-typing', stopTyping);
};
