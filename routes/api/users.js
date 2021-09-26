const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('../../models/user');
const Notification = require('../../models/notification');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', async (req, res) => {
  let searchObj = req.query;

  if (searchObj.search !== undefined) {
    searchObj = {
      $or: [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } },
      ],
    };
  }

  const users = await User.find(searchObj).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });
  if (users) {
    res.status(200).send(users);
  }
});

router.put('/:userId/follow', async (req, res) => {
  const userId = req.params.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.sendStatus(404);
  }

  const isFollowing =
    user.followers && user.followers.includes(req.session.user._id);

  const option = isFollowing ? '$pull' : '$addToSet';

  req.session.user = await User.findByIdAndUpdate(
    req.session.user._id,
    { [option]: { following: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  User.findByIdAndUpdate(userId, {
    [option]: { followers: req.session.user._id },
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  if (!isFollowing) {
    await Notification.insertNotification(
      userId,
      req.session.user._id,
      'follow',
      req.session.user._id
    );
  }

  res.status(200).send(req.session.user);
});

router.get('/:userId/following', async (req, res) => {
  const user = await User.findById(req.params.userId)
    .populate('following')
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  res.status(200).send(user);
});

router.get('/:userId/followers', async (req, res) => {
  const user = await User.findById(req.params.userId)
    .populate('followers')
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  res.status(200).send(user);
});

router.post(
  '/profilePicture',
  upload.single('croppedImage'),
  async (req, res) => {
    if (!req.file) {
      console.log('No file uploaded with ajax request');
      return res.sendStatus(400);
    }

    const filePath = `/uploads/images/${req.file.filename}.png`;
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, `../../${filePath}`);
    fs.rename(tempPath, targetPath, async (error) => {
      if (error != null) {
        console.log(error);
        return res.sendStatus(400);
      }

      req.session.user = await User.findByIdAndUpdate(
        req.session.user._id,
        {
          profilePic: filePath,
        },
        { new: true }
      );

      res.sendStatus(204);
    });
  }
);

router.post('/coverPhoto', upload.single('croppedImage'), async (req, res) => {
  if (!req.file) {
    console.log('No file uploaded with ajax request');
    return res.sendStatus(400);
  }

  const filePath = `/uploads/images/${req.file.filename}.png`;
  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, `../../${filePath}`);
  fs.rename(tempPath, targetPath, async (error) => {
    if (error != null) {
      console.log(error);
      return res.sendStatus(400);
    }

    req.session.user = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        coverPhoto: filePath,
      },
      { new: true }
    );

    res.sendStatus(204);
  });
});

module.exports = router;
