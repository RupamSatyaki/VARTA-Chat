const Message = require('../models/Message');
const Chat = require('../models/Chat');

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Public (Should be private with auth middleware)
 */
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, type, chatId } = req.body;

    if (!senderId || !receiverId || !content || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide senderId, receiverId, content and chatId'
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content,
      type: type || 'text',
      status: 'sent',
      chat: chatId,
    });

    // Update the chat document with the latest message
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error(`❌ Error in sendMessage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get messages between two users (Conversation history)
 * @route   GET /api/messages/:senderId/:receiverId
 * @access  Public
 */
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    // Find messages where (sender is user1 AND receiver is user2) OR (sender is user2 AND receiver is user1)
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    }).sort({ createdAt: 1 }); // Sort by time (ascending)

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error(`❌ Error in getMessages: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  sendMessage,
  getMessages
};
