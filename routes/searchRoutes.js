const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  const payload = createPayload(req.session.user);
  payload.selectedTab = 'posts';
  res.status(200).render('searchPage', payload);
});

router.get('/:selectedTab', (req, res) => {
  const payload = createPayload(req.session.user);
  payload.selectedTab = req.params.selectedTab || 'posts';
  res.status(200).render('searchPage', payload);
});

const createPayload = (userLoggedIn) => {
  return {
    pageTitle: 'Search',
    userLoggedIn: userLoggedIn,
    userLoggedInJs: JSON.stringify(userLoggedIn),
  };
};

module.exports = router;
