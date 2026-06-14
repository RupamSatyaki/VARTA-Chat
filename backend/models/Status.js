const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mediaUrl: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  caption: {
    type: String,
    default: '',
  },
  viewers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Automatically delete after 24 hours (86400 seconds)
  },
}, {
  timestamps: true,
});

const Status = mongoose.model('Status', statusSchema);

module.exports = Status;
