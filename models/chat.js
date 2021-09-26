const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
      },
    ],
    latestMessage: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

const chat = mongoose.model('Chat', chatSchema);

module.exports = chat;
