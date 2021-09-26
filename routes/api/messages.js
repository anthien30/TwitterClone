const express = require('express');

const Message = require('../../models/message');
const User = require('../../models/user');
const Chat = require('../../models/chat');
const Notification = require('../../models/notification');

const router = express.Router();

router.post('/', async (req, res) => {
  if (!req.body.content || !req.body.chatId) {
    console.log('Invalid data passed into request');
    return res.sendStatus(400);
  }

  const newMessage = {
    sender: req.session.user._id,
    content: req.body.content,
    chat: req.body.chatId,
  };

  let message = await Message.create(newMessage).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  message = await User.populate(message, { path: 'sender' });
  message = await Chat.populate(message, { path: 'chat' });
  message = await User.populate(message, { path: 'chat.users' });

  const chat = await Chat.findByIdAndUpdate(req.body.chatId, {
    latestMessage: message,
  }).catch((error) => console.log(error));

  insertNotification(chat, message);

  res.status(201).send(message);
});

const insertNotification = (chat, message) => {
  chat.users.forEach((userId) => {
    if (userId == message.sender._id.toString()) return;
    Notification.insertNotification(
      userId,
      message.sender._id,
      'newMessage',
      message.chat._id
    );
  });
};

module.exports = router;
