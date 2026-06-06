const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chat: { // New field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true, // A message must belong to a chat
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file'],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Message = mongoose.model('Message', messageSchema);
console.log('✔ Model loaded: Message');

module.exports = Message;
