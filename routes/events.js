const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/events', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, sales, orders, stock, revenue, cost
       FROM events
       ORDER BY id`
    );
    res.json({ count: result.rows.length, events: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Events could not be loaded.' });
  }
});

router.get('/events/:id', async function (req, res) {
  try {
    const eventResult = await pool.query(
      'SELECT id, name, sales, orders, stock, revenue, cost FROM events WHERE id = $1',
      [req.params.id]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ message: 'Event was not found.' });
      return;
    }

    const itemsResult = await pool.query(
      `SELECT items.id, items.name, items.sku
       FROM items
       WHERE items.event_id = $1
       ORDER BY items.name`,
      [req.params.id]
    );

    const eventRow = eventResult.rows[0];
    eventRow.items = itemsResult.rows;
    eventRow.profit = Number(eventRow.revenue) - Number(eventRow.cost);
    res.json(eventRow);
  } catch (error) {
    res.status(500).json({ message: 'Event could not be loaded.' });
  }
});

module.exports = router;
