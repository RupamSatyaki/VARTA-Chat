const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Define routes
router.post('/login', login);

module.exports = router;
