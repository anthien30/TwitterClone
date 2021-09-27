let connected = false;

const scheme = mode == 'development' ? 'http' : 'https';
const socket = io(`${scheme}://${window.location.host}`);
socket.emit('setup', userLoggedIn);

socket.on('connected', () => (connected = true));

socket.on('message received', (newMessage) => {
  messageReceived(newMessage);
});

socket.on('notification received', () => {
  $.get('/api/notifications/latest', (notificationData) => {
    showNotificationPopup(notificationData);
    refreshNotificationsBadge();
  });
});

const emitNotification = (userId) => {
  if (userId == userLoggedIn._id) return;

  socket.emit('notification received', userId);
};
