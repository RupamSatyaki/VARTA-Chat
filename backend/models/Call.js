const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Keep receiver for backward compatibility with 1-on-1 calls
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['ringing', 'joined', 'declined', 'missed', 'left'],
      default: 'ringing'
    },
    joinedAt: Date,
    leftAt: Date
  }],
  chat: { // Reference to group chat if it's a group call
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  isGroupCall: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    default: 'video',
  },
  status: {
    type: String,
    enum: ['missed', 'rejected', 'completed', 'ongoing'],
    default: 'ongoing',
  },
  duration: {
    type: Number, // In seconds
    default: 0,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Call = mongoose.model('Call', callSchema);
console.log('✔ Model loaded: Call');

module.exports = Call;
