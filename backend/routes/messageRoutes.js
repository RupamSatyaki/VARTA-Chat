const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/messages/:senderId/:receiverId
// @desc    Get all messages for a chat
// @access  Private
router.get('/:senderId/:receiverId', authMiddleware, messageController.getMessages);

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post('/', authMiddleware, messageController.sendMessage);

module.exports = router;
