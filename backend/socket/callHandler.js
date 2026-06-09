/**
 * Call-related Socket event handlers for WebRTC signaling
 */
module.exports = (io, socket) => {
  
  // Initiate a call
  const callUser = ({ to, from, signalData, fromName, fromPic, type }) => {
    console.log(`📞 Calling user ${to} from ${from} (${fromName})`);
    socket.to(to).emit('incoming-call', {
      from,
      signalData,
      fromName,
      fromPic,
      type: type || 'video'
    });
  };

  // Answer a call
  const answerCall = ({ to, signalData }) => {
    console.log(`📞 Answering call for user ${to}`);
    socket.to(to).emit('call-accepted', signalData);
  };

  // Reject a call
  const rejectCall = ({ to }) => {
    console.log(`📞 Call rejected for user ${to}`);
    socket.to(to).emit('call-rejected');
  };

  // Exchange ICE candidates
  const iceCandidate = ({ to, candidate }) => {
    // console.log(`❄ Sending ICE candidate to ${to}`);
    socket.to(to).emit('ice-candidate', candidate);
  };

  // End a call
  const endCall = ({ to }) => {
    console.log(`📞 Ending call for user ${to}`);
    socket.to(to).emit('call-ended');
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
