/**
 * Call-related Socket event handlers for WebRTC signaling
 */
const Call = require('../models/Call');

module.exports = (io, socket) => {
  
  // Initiate a call
  const callUser = async ({ to, from, signalData, fromName, fromPic, type }) => {
    console.log(`📞 Calling user ${to} from ${from} (${fromName})`);
    
    try {
      // Create a new call record
      const newCall = await Call.create({
        caller: from,
        receiver: to,
        type: type || 'video',
        status: 'ongoing',
        startedAt: new Date()
      });
      
      // Store callId in socket for future reference during this session
      socket.currentCallId = newCall._id;

      socket.to(to).emit('incoming-call', {
        from,
        signalData,
        fromName,
        fromPic,
        type: type || 'video',
        callId: newCall._id // Send callId to receiver
      });
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
        await Call.findByIdAndUpdate(callId, { 
          status: 'rejected',
          endedAt: new Date()
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
  const endCall = async ({ to, callId, duration }) => {
    console.log(`📞 Ending call for user ${to}`);
    
    if (callId || socket.currentCallId) {
      const id = callId || socket.currentCallId;
      try {
        const call = await Call.findById(id);
        if (call && call.status === 'ongoing') {
          const endedAt = new Date();
          const calculatedDuration = duration || Math.floor((endedAt - call.startedAt) / 1000);
          
          await Call.findByIdAndUpdate(id, {
            status: 'completed',
            endedAt: endedAt,
            duration: calculatedDuration > 0 ? calculatedDuration : 0
          });
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
