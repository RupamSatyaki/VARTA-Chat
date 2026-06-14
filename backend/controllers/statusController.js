const Status = require('../models/Status');
const User = require('../models/User');

// Create a new status
const createStatus = async (req, res) => {
  try {
    const { mediaUrl, type, caption } = req.body;
    const userId = req.user.id;

    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media URL is required' });
    }

    const newStatus = await Status.create({
      user: userId,
      mediaUrl,
      type: type || 'image',
      caption: caption || '',
    });

    res.status(201).json({ success: true, data: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all statuses from contacts (for simplicity, getting all for now)
const getAllStatuses = async (req, res) => {
  try {
    const statuses = await Status.find()
      .populate('user', 'name profilePic number')
      .sort({ createdAt: -1 });

    // Group statuses by user
    const groupedStatuses = statuses.reduce((acc, status) => {
      const userId = status.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: status.user,
          statuses: [],
        };
      }
      acc[userId].statuses.push(status);
      return acc;
    }, {});

    res.status(200).json({ success: true, data: Object.values(groupedStatuses) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark status as viewed
const viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Check if user already viewed
    const alreadyViewed = status.viewers.some(v => v.user.toString() === userId.toString());
    if (!alreadyViewed) {
      status.viewers.push({ user: userId });
      await status.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createStatus,
  getAllStatuses,
  viewStatus,
};
