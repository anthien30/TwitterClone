const express = require('express');
const Notification = require('../../models/notification');

const router = express.Router();

router.get('/', async (req, res) => {
  const searchObj = {
    userTo: req.session.user._id,
    userFrom: { $ne: req.session.user._id },
    notificationType: { $ne: 'newMessage' },
  };

  if (req.query.unreadOnly == 'true') {
    searchObj.opened = false;
  }

  const results = await Notification.find(searchObj)
    .populate('userFrom')
    .populate('userTo')
    .sort({ createdAt: -1 })
    .catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });

  res.status(200).send(results);
});

router.get('/latest', async (req, res) => {
  const results = await Notification.findOne({
    userTo: req.session.user._id,
    userFrom: { $ne: req.session.user._id },
  })
    .populate('userFrom')
    .populate('userTo')
    .sort({ createdAt: -1 })
    .catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });

  res.status(200).send(results);
});

router.put('/:id/open', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    opened: true,
  }).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  res.sendStatus(204);
});

router.put('/open', async (req, res) => {
  await Notification.updateMany(
    { userTo: req.session.user._id },
    {
      opened: true,
    }
  ).catch((error) => {
    console.log(error);
    return res.sendStatus(400);
  });

  res.sendStatus(204);
});

module.exports = router;
