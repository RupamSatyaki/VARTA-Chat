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
    required: false, // Changed to false for Group Chat
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
    enum: ['text', 'image', 'video', 'audio', 'file', 'call'],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
  },
  deliveredAt: {
    type: Date,
  },
  seenAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  readBy: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      seenAt: { type: Date, default: Date.now }
    },
  ],
  deliveredTo: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      deliveredAt: { type: Date, default: Date.now }
    },
  ],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: { type: String },
    },
  ],
  linkPreview: {
    title: { type: String },
    description: { type: String },
    image: { type: String },
    url: { type: String },
    siteName: { type: String },
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  callMeta: {
    callType: { type: String, enum: ['audio', 'video'] },
    status:   { type: String, enum: ['completed', 'missed', 'rejected'] },
    duration: { type: Number, default: 0 },
    callId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Call' },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      status: String,
      joinedAt: Date
    }]
  },
}, {
  timestamps: true,
});

const Message = mongoose.model('Message', messageSchema);
console.log('✔ Model loaded: Message');

module.exports = Message;
