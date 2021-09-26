const express = require('express');
const mongoose = require('mongoose');
const Chat = require('../models/chat');
const User = require('../models/user');

const router = express.Router();

router.get('/', (req, res) => {
  const payload = {
    pageTitle: 'Inbox',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render('inboxPage', payload);
});

router.get('/new', (req, res) => {
  res.status(200).render('newMessage', {
    pageTitle: 'New Message',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  });
});

router.get('/:chatId', async (req, res) => {
  const userId = req.session.user._id;
  const chatId = req.params.chatId;
  const isValidId = mongoose.isValidObjectId(chatId);

  const payload = {
    pageTitle: 'Chat',
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };

  if (!isValidId) {
    payload.errorMessage = 'Invalid chat Id';
    return res.status(200).render('chatPage', payload);
  }

  let chat = await Chat.findOne({
    _id: chatId,
    users: { $elemMatch: { $eq: userId } },
  }).populate('users');

  if (!chat) {
    const userFound = await User.findById(chatId);
    if (userFound) {
      chat = await getChatByUserId(userId, userFound._id).populate('users');
    }
  }
  if (!chat) {
    payload.errorMessage =
      "Chat doesn't exist or you don't have view permission";
  } else {
    payload.chat = chat;
  }

  res.status(200).render('chatPage', payload);
});

// attemps to find the chat of current user with a user, make a new chat if it doesnt realy exist
const getChatByUserId = (userLoggedInId, otherUserId) => {
  return Chat.findOneAndUpdate(
    {
      isGroupChat: false,
      users: {
        $size: 2,
        $all: [
          { $elemMatch: { $eq: mongoose.Types.ObjectId(userLoggedInId) } },
          { $elemMatch: { $eq: mongoose.Types.ObjectId(otherUserId) } },
        ],
      },
    },
    {
      $setOnInsert: {
        users: [userLoggedInId, otherUserId],
      },
    },
    {
      new: true,
      upsert: true,
    }
  );
};

module.exports = router;
