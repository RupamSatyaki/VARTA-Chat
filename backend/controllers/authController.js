const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * @desc    Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * @desc    Login/Register user with phone number
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a phone number' 
      });
    }

    console.log(`\n[AUTH] Login/Register attempt for number: ${number}`);

    // 1. Check if user already exists
    let user = await User.findOne({ number });

    if (user) {
      console.log(`✔ Existing user found: ${user._id}`);
      // Update online status
      user.isOnline = true;
      user.lastSeen = Date.now();
      await user.save();
    } else {
      console.log(`⌛ Creating new user for number: ${number}`);
      // 2. Create new user if doesn't exist
      const tempUsername = `user_${number.slice(-4)}${Math.floor(Math.random() * 1000)}`;
      
      user = await User.create({
        number,
        name: `User ${number.slice(-4)}`,
        username: tempUsername,
        isOnline: true
      });
      console.log(`✔ New user created: ${user._id}`);
    }

    // 3. Generate Token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: user.isNew ? 'User registered successfully' : 'Logged in successfully',
      token,
      data: user
    });
  } catch (error) {
    console.error(`❌ Error in login controller: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  login
};
