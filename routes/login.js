const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/login', async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required.' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT username FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Those credentials are not recognised.' });
      return;
    }

    res.json({ username: result.rows[0].username });
  } catch (error) {
    res.status(500).json({ message: 'Login could not be checked.' });
  }
});

module.exports = router;
