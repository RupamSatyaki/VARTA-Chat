/**
 * Call-related Socket event handlers for WebRTC signaling
 */
const Call = require('../models/Call');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Helper: save a call event as a message in the 1-on-1 chat
const saveCallMessage = async (callerId, receiverId, callType, status, duration = 0) => {
  try {
    const chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [callerId, receiverId] }
    });
    if (!chat) return;

    const durationText = duration > 0
      ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`
      : '';
    const label = `${callType === 'video' ? 'Video' : 'Audio'} call${durationText}`;

    const msg = await Message.create({
      sender: callerId,
      receiver: receiverId,
      chat: chat._id,
      content: label,
      type: 'call',
      status: 'sent',
      readBy: [callerId],
      callMeta: { callType, status, duration },
    });

    await Chat.findByIdAndUpdate(chat._id, { latestMessage: msg._id });

    // Emit to both users so ChatScreen updates live
    io.to(callerId.toString()).to(receiverId.toString()).emit('message-received', {
      _id: msg._id,
      chatId: chat._id,
      content: label,
      type: 'call',
      senderId: callerId,
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      callMeta: { callType, status, duration },
    });
  } catch (err) {
    console.error('Error saving call message:', err.message);
  }
};

let io; // Will be set from module export

module.exports = (ioInstance, socket) => {
  io = ioInstance;
  
  // Initiate a call
  const callUser = async ({ to, from, signalData, fromName, fromPic, type, chatId }) => {
    console.log(`📞 Calling ${chatId ? 'group ' + chatId : 'user ' + to} from ${from} (${fromName})`);
    
    try {
      // 1. Determine recipients
      let recipients = [];
      if (chatId) {
        const chat = await Chat.findById(chatId).populate('users', '_id');
        if (chat && chat.isGroupChat) {
          recipients = chat.users
            .map(u => u._id.toString())
            .filter(id => id !== from.toString());
        } else {
          recipients = [to];
        }
      } else {
        recipients = [to];
      }

      // 2. Create call records (one for each recipient or a single one with group ref)
      // For now, let's create a single record for the first recipient or a placeholder
      const newCall = await Call.create({
        caller: from,
        receiver: recipients[0] || to, // Simple fallback
        type: type || 'video',
        status: 'ongoing',
        startedAt: new Date()
      });
      
      socket.currentCallId = newCall._id;

      // 3. Notify recipients
      recipients.forEach(targetId => {
        io.to(targetId).emit('incoming-call', {
          from,
          signalData,
          fromName,
          fromPic,
          type: type || 'video',
          callId: newCall._id,
          chatId: chatId // Pass chatId so receiver knows it's a group call
        });
      });

      // Notify caller room (for history update)
      io.to(from).emit('call-log-updated');
      
    } catch (error) {
      console.error('Error creating call log:', error);
    }
  };

  // Answer a call
  const answerCall = async ({ to, signalData, callId }) => {
    console.log(`📞 Answering call for user ${to}`);
    
    if (callId) {
      try {
        await Call.findByIdAndUpdate(callId, { startedAt: new Date() });
        // No need to emit update here as it's still ongoing, 
        // but could be done if we wanted to show "Connected" status in list
      } catch (error) {
        console.error('Error updating call start time:', error);
      }
    }
    
    socket.to(to).emit('call-accepted', signalData);
  };

  // Reject a call
  const rejectCall = async ({ to, callId }) => {
    console.log(`📞 Call rejected for user ${to}`);
    
    if (callId) {
      try {
        const updatedCall = await Call.findByIdAndUpdate(callId, { 
          status: 'rejected',
          endedAt: new Date()
        }, { new: true });
        
        if (updatedCall) {
          io.to(updatedCall.caller.toString()).to(updatedCall.receiver.toString()).emit('call-log-updated');
          await saveCallMessage(updatedCall.caller, updatedCall.receiver, updatedCall.type, 'rejected', 0);
        }
      } catch (error) {
        console.error('Error updating call rejection:', error);
      }
    }
    
    socket.to(to).emit('call-rejected');
  };

  // Exchange ICE candidates
  const iceCandidate = ({ to, candidate }) => {
    // console.log(`❄ Sending ICE candidate to ${to}`);
    socket.to(to).emit('ice-candidate', candidate);
  };

  // End a call
  const endCall = async ({ to, callId, duration }) => {
    console.log(`📞 Ending call for user ${to}`);
    
    if (callId || socket.currentCallId) {
      const id = callId || socket.currentCallId;
      try {
        const call = await Call.findById(id);
        if (call && call.status === 'ongoing') {
          const endedAt = new Date();
          const calculatedDuration = duration || Math.floor((endedAt - call.startedAt) / 1000);
          const callStatus = calculatedDuration > 0 ? 'completed' : 'missed';

          const updatedCall = await Call.findByIdAndUpdate(id, {
            status: callStatus,
            endedAt: endedAt,
            duration: calculatedDuration > 0 ? calculatedDuration : 0
          }, { new: true });

          if (updatedCall) {
            io.to(updatedCall.caller.toString()).to(updatedCall.receiver.toString()).emit('call-log-updated');
            await saveCallMessage(updatedCall.caller, updatedCall.receiver, updatedCall.type, callStatus, calculatedDuration > 0 ? calculatedDuration : 0);
          }
        }
      } catch (error) {
        console.error('Error ending call log:', error);
      }
    }
    
    socket.to(to).emit('call-ended');
    socket.currentCallId = null;
  };

  // Update media state (mic/camera toggle)
  const updateMediaState = ({ to, isMuted, isCameraOff }) => {
    socket.to(to).emit('remote-media-state-updated', { isMuted, isCameraOff });
  };

  // Request media state from peer
  const requestMediaState = ({ to }) => {
    socket.to(to).emit('request-remote-media-state');
  };

  // Register events
  socket.on('call-user', callUser);
  socket.on('answer-call', answerCall);
  socket.on('reject-call', rejectCall);
  socket.on('ice-candidate', iceCandidate);
  socket.on('end-call', endCall);
  socket.on('update-media-state', updateMediaState);
  socket.on('request-media-state', requestMediaState);
};
