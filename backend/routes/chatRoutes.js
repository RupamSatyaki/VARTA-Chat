const express = require('express');
const { 
  accessChat, 
  fetchChats, 
  findChat, 
  createGroupChat, 
  renameGroup, 
  addToGroup, 
  removeFromGroup 
} = require('../controllers/chatController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, accessChat).get(protect, fetchChats);
router.route('/find/:firstUserId/:secondUserId').get(protect, findChat);
router.route('/group').post(protect, createGroupChat);
router.route('/rename').put(protect, renameGroup);
router.route('/groupadd').put(protect, addToGroup);
router.route('/groupremove').put(protect, removeFromGroup);

module.exports = router;
