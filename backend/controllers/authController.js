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

    // Temporary: Just log the number to console as requested
    console.log(`\n[AUTH] Login attempt received for number: ${number}`);

    res.status(200).json({
      success: true,
      message: 'Number received successfully',
      data: { number }
    });
  } catch (error) {
    console.error(`Error in login controller: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

module.exports = {
  login
};
