const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  number: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple users to have no email (null) while keeping uniqueness for those who have it
    trim: true,
    lowercase: true,
  },
  profilePic: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Default placeholder
  },
  bio: {
    type: String,
    default: 'Hey there! I am using VARTA.',
    maxLength: [150, 'Bio cannot be more than 150 characters'],
  },
  status: {
    type: String,
    default: 'Available',
    enum: ['Available', 'Busy', 'At School', 'At the Movies', 'At Work', 'Battery about to die', 'Can\'t talk, VARTA only'],
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('User', userSchema);
