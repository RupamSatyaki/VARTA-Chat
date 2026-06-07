const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateProfile } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');

// Define routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/profile', protect, updateProfile);

module.exports = router;
