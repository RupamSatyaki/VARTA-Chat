const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
