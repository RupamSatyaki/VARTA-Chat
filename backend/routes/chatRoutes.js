const express = require('express');
const { accessChat, fetchChats, findChat } = require('../controllers/chatController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, accessChat).get(protect, fetchChats);
router.route('/find/:firstUserId/:secondUserId').get(protect, findChat);

module.exports = router;
