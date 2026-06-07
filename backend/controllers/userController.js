const User = require('../models/User');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Public (Will make private later)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-__v'); // Exclude version key
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(`❌ Error in getAllUsers controller: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(`❌ Error in getUserById controller: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio || user.bio;
      user.profilePic = req.body.profilePic || user.profilePic;
      user.username = req.body.username || user.username;
      user.birthday = req.body.birthday || user.birthday;

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error(`❌ Error in updateProfile controller: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateProfile
};
