const bcrypt = require('bcrypt');
const express = require('express');

const User = require('../models/user');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).render('register');
});

router.post('/', async (req, res) => {
  const firstName = req.body.firstName.trim();
  const lastName = req.body.lastName.trim();
  const username = req.body.username.trim();
  const email = req.body.email.trim();
  const password = req.body.password;

  let payload = req.body;
  if (firstName && lastName && username && email && password) {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }).catch((error) => {
      console.log(error);
      payload.errorMessage = 'Something went wrong.';
      return res.status(200).render('register', payload);
    });

    if (existingUser) {
      if (existingUser.email === email) {
        payload.errorMessage = 'Email already in use.';
        return res.status(200).render('register', payload);
      } else {
        payload.errorMessage = 'Username already exists.';
        return res.status(200).render('register', payload);
      }
    } else {
      const userData = {
        firstName,
        lastName,
        username,
        email,
        password,
      };

      userData.password = await bcrypt.hash(password, 10);

      const newUser = await User.create(userData);
      req.session.user = newUser;
      return res.redirect('/');
    }
  } else {
    payload.errorMessage = 'Make sure each field has a valid value.';
    res.status(200).render('register', payload);
  }
});

module.exports = router;
