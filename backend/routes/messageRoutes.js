const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/messages/media/:chatId
// @desc    Get shared media, links, and docs for a specific chat
// @access  Private
router.get('/media/:chatId', authMiddleware, messageController.getChatMedia);

// @route   GET /api/messages/:chatId
// @desc    Get all messages for a specific chat
// @access  Private
router.get('/:chatId', authMiddleware, messageController.getChatMessages);

// @route   GET /api/messages/:senderId/:receiverId
// @desc    Get all messages between two users (Legacy)
// @access  Private
router.get('/:senderId/:receiverId', authMiddleware, messageController.getMessages);

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post('/', authMiddleware, messageController.sendMessage);

module.exports = router;
