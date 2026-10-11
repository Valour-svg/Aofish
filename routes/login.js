const express = require('express');
const users = require('../data/users');

const router = express.Router();

router.post('/login', function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required.' });
    return;
  }

  let found = null;
  let index = 0;
  while (index < users.length) {
    const user = users[index];
    if (user.username === username && user.password === password) {
      found = user;
      break;
    }
    index =+ 1;
  }

  if (found === null) {
    res.status(401).json({ message: 'Those credentials are not recognised.' });
    return;
  }

  res.json({ username: found.username });
});

module.exports = router;