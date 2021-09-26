const express = require('express');
const path = require('path');
const session = require('express-session');

require('./database');
const middleware = require('./middleware');

const app = express();
const port = 3003;

const server = app.listen(process.env.PORT || port, () => {
  console.log('Server listening on port ' + 3003);
});

const io = require('socket.io')(server, {
  allowEIO3: true,
  pingTimeout: 60000,
});

app.set('view engine', 'pug');
app.set('views', 'views');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
  })
);

// Routes
const loginRoute = require('./routes/loginRoutes');
const registerRoute = require('./routes/registerRoutes');
const logoutRoute = require('./routes/logoutRoutes');
const postRoute = require('./routes/postRoutes');
const profileRoute = require('./routes/profileRoutes');
const uploadRoute = require('./routes/uploadRoutes');
const searchRoute = require('./routes/searchRoutes');
const messagesRoute = require('./routes/messagesRoutes');
const notificationsRoute = require('./routes/notificationRoutes');
// API Routes
const postsApiRoute = require('./routes/api/posts');
const usersApiRoute = require('./routes/api/users');
const chatsApiRoute = require('./routes/api/chats');
const messagesApiRoute = require('./routes/api/messages');
const notificationsApiRoute = require('./routes/api/notifications');

app.use('/login', loginRoute);
app.use('/register', registerRoute);
app.use('/logout', logoutRoute);
app.use(middleware.requireLogin);
app.use('/posts', postRoute);
app.use('/profile', profileRoute);
app.use('/uploads', uploadRoute);
app.use('/search', searchRoute);
app.use('/messages', messagesRoute);
app.use('/notifications', notificationsRoute);
app.use('/api/posts', postsApiRoute);
app.use('/api/users', usersApiRoute);
app.use('/api/chats', chatsApiRoute);
app.use('/api/messages', messagesApiRoute);
app.use('/api/notifications/', notificationsApiRoute);
app.get('/', (req, res) => {
  const payload = {
    pageTitle: 'Home',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render('home', payload);
});

io.on('connection', (socket) => {
  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join room', (chatId) => socket.join(chatId));

  socket.on('typing', (chatId) => socket.in(chatId).emit('typing'));

  socket.on('stop typing', (chatId) => socket.in(chatId).emit('stop typing'));

  socket.on('notification received', (userId) =>
    socket.in(userId).emit('notification received')
  );

  socket.on('new message', (newMessage) => {
    const chat = newMessage.chat;
    if (!chat.users) return console.log('Chat.users undefined');

    chat.users.forEach((user) => {
      if (user._id == newMessage.sender._id) return;
      socket.in(user._id).emit('message received', newMessage);
    });
  });
});
