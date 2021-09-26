const express = require('express');
const Chat = require('../../models/chat');
const Message = require('../../models/message');
const User = require('../../models/user');

const router = express.Router();

router.get('/', async (req, res) => {
  let chats = await Chat.find({
    users: { $elemMatch: { $eq: req.session.user._id } },
  })
    .populate('users')
    .populate('latestMessage')
    .sort({ updatedAt: -1 })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });

  if (req.query.unreadOnly == 'true') {
    chats = chats.filter(
      (chat) =>
        chat.latestMessage &&
        !chat.latestMessage.readBy.includes(req.session.user._id) &&
        chat.latestMessage.sender != req.session.user._id
    );
  }

  chats = await User.populate(chats, { path: 'latestMessage.sender' });
  res.status(200).send(chats);
});

router.post('/', async (req, res) => {
  if (!req.body.users) {
    console.log('Users param not sent with request');
    return res.sendStatus(400);
  }

  const users = JSON.parse(req.body.users);

  if (users.length === 0) {
    console.log('Users array is empty');
    return res.sendStatus(400);
  }

  users.push(req.session.user);

  const chatData = {
    users: users,
    isGroupChat: true,
  };

  const chat = await Chat.create(chatData).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  res.status(200).send(chat);
});

router.put('/:chatId', async (req, res) => {
  await Chat.findByIdAndUpdate(req.params.chatId, req.body).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  res.status(200).sendStatus(204);
});

router.get('/:chatId/messages', async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate('sender')
    .catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });

  res.status(200).send(messages);
});

router.put('/:chatId/messages/readall', async (req, res) => {
  await Message.updateMany(
    { chat: req.params.chatId },
    { $addToSet: { readBy: req.session.user._id } }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  res.sendStatus(204);
});

module.exports = router;
