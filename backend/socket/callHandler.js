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
        const chat = await Chat.findById(chatId).populate('users', '_id name profilePic');
        if (chat && chat.isGroupChat) {
          recipients = chat.users
            .filter(u => u._id.toString() !== from.toString());
        } else {
          recipients = [{ _id: to }];
        }
      } else {
        recipients = [{ _id: to }];
      }

      // 2. Create call record with participants
      const participantList = recipients.map(r => ({
        user: r._id,
        status: 'ringing'
      }));

      const newCall = await Call.create({
        caller: from,
        receiver: chatId ? null : recipients[0]?._id, // Backward compatibility
        participants: participantList,
        chat: chatId || null,
        isGroupCall: !!chatId,
        type: type || 'video',
        status: 'ongoing',
        startedAt: new Date()
      });
      
      socket.currentCallId = newCall._id;

      // 3. Notify recipients
      recipients.forEach(r => {
        io.to(r._id.toString()).emit('incoming-call', {
          from,
          signalData,
          fromName,
          fromPic,
          type: type || 'video',
          callId: newCall._id,
          chatId: chatId // Pass chatId so receiver knows it's a group call
        });
      });

      // Notify caller room about the initial participants state
      const populatedCall = await Call.findById(newCall._id).populate('participants.user', 'name profilePic');
      io.to(from).emit('call-participants-update', populatedCall.participants);

      // Notify caller room (for history update)
      io.to(from).emit('call-log-updated');
      
    } catch (error) {
      console.error('Error creating call log:', error);
    }
  };

  // Answer a call
  const answerCall = async ({ to, signalData, callId, userId }) => {
    console.log(`📞 User ${userId} answering call ${callId}`);
    
    if (callId) {
      try {
        const call = await Call.findById(callId);
        if (call) {
          // Update status for this participant
          await Call.updateOne(
            { _id: callId, 'participants.user': userId },
            { 
              $set: { 
                'participants.$.status': 'joined',
                'participants.$.joinedAt': new Date() 
              }
            }
          );

          // Update overall call start time if first one joining
          if (call.status === 'ongoing' && !call.startedAt) {
            await Call.findByIdAndUpdate(callId, { startedAt: new Date() });
          }

          // Fetch fresh list and broadcast to everyone in the call
          const updatedCall = await Call.findById(callId).populate('participants.user', 'name profilePic');
          const callerId = updatedCall.caller.toString();
          
          // Broadcast to caller and all participants
          const allNotifyIds = [callerId, ...updatedCall.participants.map(p => p.user._id.toString())];
          allNotifyIds.forEach(id => {
            io.to(id).emit('call-participants-update', updatedCall.participants);
          });
        }
      } catch (error) {
        console.error('Error updating call start time:', error);
      }
    }
    
    socket.to(to).emit('call-accepted', signalData);
  };

  // Reject a call
  const rejectCall = async ({ to, callId, userId }) => {
    console.log(`📞 Call rejected by user ${userId} for call ${callId}`);
    
    if (callId && userId) {
      try {
        await Call.updateOne(
          { _id: callId, 'participants.user': userId },
          { 
            $set: { 
              'participants.$.status': 'declined',
              'participants.$.leftAt': new Date() 
            }
          }
        );

        // Fetch fresh list and broadcast
        const updatedCall = await Call.findById(callId).populate('participants.user', 'name profilePic');
        const callerId = updatedCall.caller.toString();
        
        const allNotifyIds = [callerId, ...updatedCall.participants.map(p => p.user._id.toString())];
        allNotifyIds.forEach(id => {
          io.to(id).emit('call-participants-update', updatedCall.participants);
        });

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
  const endCall = async ({ to, callId, duration, userId }) => {
    console.log(`📞 User ${userId} ending/leaving call ${callId}`);
    
    if (callId || socket.currentCallId) {
      const id = callId || socket.currentCallId;
      try {
        const call = await Call.findById(id);
        if (call) {
          // If it's a group call, maybe just mark this user as 'left'
          if (userId) {
            await Call.updateOne(
              { _id: id, 'participants.user': userId },
              { 
                $set: { 
                  'participants.$.status': 'left',
                  'participants.$.leftAt': new Date() 
                }
              }
            );
          }

          // If everyone left or caller ended it, mark call as completed
          const activeParticipants = (await Call.findById(id)).participants.filter(p => p.status === 'joined');
          
          if (activeParticipants.length === 0 || userId?.toString() === call.caller.toString()) {
            const endedAt = new Date();
            const calculatedDuration = duration || Math.floor((endedAt - call.startedAt) / 1000);
            const callStatus = calculatedDuration > 0 ? 'completed' : 'missed';

            const updatedCall = await Call.findByIdAndUpdate(id, {
              status: callStatus,
              endedAt: endedAt,
              duration: calculatedDuration > 0 ? calculatedDuration : 0
            }, { new: true });

            if (updatedCall) {
              io.to(updatedCall.caller.toString()).emit('call-log-updated');
              // Notify everyone in the group/call
              updatedCall.participants.forEach(p => {
                io.to(p.user.toString()).emit('call-log-updated');
              });
            }
          } else {
            // Just broadcast the update that one user left
            const updatedCall = await Call.findById(id).populate('participants.user', 'name profilePic');
            const callerId = updatedCall.caller.toString();
            const allNotifyIds = [callerId, ...updatedCall.participants.map(p => p.user._id.toString())];
            allNotifyIds.forEach(target => {
              io.to(target).emit('call-participants-update', updatedCall.participants);
            });
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
