const express = require('express');
const bcrypt = require('bcrypt');

const User = require('../models/user');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).render('login');
});

router.post('/', async (req, res) => {
  const payload = req.body;
  if (req.body.logUsername && req.body.logPassword) {
    const user = await User.findOne({
      $or: [
        { email: req.body.logUsername },
        { username: req.body.logUsername },
      ],
    }).catch((error) => {
      console.log(error);
      payload.errorMessage = 'Something went wrong.';
      return res.status(200).render('login', payload);
    });

    if (user) {
      const result = await bcrypt.compare(req.body.logPassword, user.password);
      if (result === true) {
        req.session.user = user;
        return res.redirect('/');
      }
    }
    payload.errorMessage = 'Login credentials incorrect';
    return res.status(200).render('login', payload);
  }

  payload.errorMessage = 'Make sure each field has a valid value';
  res.status(200).render('login');
});

module.exports = router;
