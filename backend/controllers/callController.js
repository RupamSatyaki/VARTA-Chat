const Call = require('../models/Call');

/**
 * @desc    Fetch call history for a user
 * @route   GET /api/calls
 * @access  Private
 */
const fetchCalls = async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
    })
      .populate('caller', 'name profilePic number')
      .populate('receiver', 'name profilePic number')
      .sort({ createdAt: -1 });

    res.status(200).json(calls);
  } catch (error) {
    console.error(`❌ Error in fetchCalls: ${error.message}`);
    res.status(400).send(error.message);
  }
};

/**
 * @desc    Delete a call log entry
 * @route   DELETE /api/calls/:id
 * @access  Private
 */
const deleteCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    // Check if the user is part of the call
    if (call.caller.toString() !== req.user._id.toString() && 
        call.receiver.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await Call.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Call log deleted' });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

module.exports = { fetchCalls, deleteCall };
