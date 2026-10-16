const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/events', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, sales, orders, stock, revenue, cost, start_date AS "startDate", end_date AS "endDate", city, venue
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
      'SELECT id, name, sales, orders, stock, revenue, cost, start_date AS "startDate", end_date AS "endDate", city, venue FROM events WHERE id = $1',
      [req.params.id]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ message: 'Event was not found.' });
      return;
    }

    const itemsResult = await pool.query(
      `SELECT
         items.id,
         items.name,
         items.sku,
         COALESCE(SUM(item_option_attributes.stock), 0)::int AS stock
       FROM items
       LEFT JOIN item_options ON item_options.item_id = items.id
       LEFT JOIN item_option_attributes ON item_option_attributes.item_option_id = item_options.id
       WHERE items.event_id = $1
       GROUP BY items.id
       ORDER BY items.name`,
      [req.params.id]
    );

    const ordersResult = await pool.query(
      `SELECT
         payments.id,
         payments.order_code AS "orderCode",
         payments.items_cost AS "itemsCost",
         payments.packaging_cost AS "packagingCost",
         payments.gst_cost AS "gstCost",
         payments.grand_total AS "grandTotal",
         payments.created_at AS "createdAt"
       FROM payments
       WHERE payments.event_id = $1
       ORDER BY payments.id DESC`,
      [req.params.id]
    );

    const linesResult = await pool.query(
      `SELECT
         payment_lines.payment_id AS "paymentId",
         payment_lines.kind,
         payment_lines.name,
         payment_lines.detail,
         payment_lines.quantity,
         payment_lines.unit_price AS "unitPrice",
         payment_lines.line_total AS "lineTotal"
       FROM payment_lines
       JOIN payments ON payments.id = payment_lines.payment_id
       WHERE payments.event_id = $1
       ORDER BY payment_lines.id`,
      [req.params.id]
    );

    const eventRow = eventResult.rows[0];
    eventRow.items = itemsResult.rows;
    eventRow.ordersList = ordersResult.rows;
    eventRow.orderLines = linesResult.rows;
    eventRow.profit = Number(eventRow.revenue) - Number(eventRow.cost);
    res.json(eventRow);
  } catch (error) {
    res.status(500).json({ message: 'Event could not be loaded.' });
  }
});

router.post('/events', async function (req, res) {
  const name = (req.body.name || '').trim();
  const startDate = req.body.startDate || '';
  const endDate = req.body.endDate || '';
  const city = (req.body.city || '').trim();
  const venue = (req.body.venue || '').trim();
  const cost = Number(req.body.cost || 0);
  const itemIds = [];
  let idIndex = 0;
  const rawIds = req.body.itemIds || [];
  while (idIndex < rawIds.length) {
    itemIds.push(Number(rawIds[idIndex]));
    idIndex = idIndex + 1;
  }

  if (name === '') {
    res.status(400).json({ message: 'An event name is required.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let stockTotal = 0;
    if (itemIds.length > 0) {
      const stockResult = await client.query(
        `SELECT COALESCE(SUM(item_option_attributes.stock), 0)::int AS stock
         FROM items
         LEFT JOIN item_options ON item_options.item_id = items.id
         LEFT JOIN item_option_attributes ON item_option_attributes.item_option_id = item_options.id
         WHERE items.id = ANY($1::int[])`,
        [itemIds]
      );
      stockTotal = stockResult.rows[0].stock;
    }

    const eventResult = await client.query(
      `INSERT INTO events (name, start_date, end_date, city, venue, cost, sales, orders, stock, revenue)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, 0)
       RETURNING id, name`,
      [name, startDate, endDate, city, venue, cost, stockTotal]
    );
    const eventId = eventResult.rows[0].id;

    let index = 0;
    while (index < itemIds.length) {
      await client.query('UPDATE items SET event_id = $1 WHERE id = $2', [eventId, itemIds[index]]);
      index = index + 1;
    }

    await client.query('COMMIT');
    res.status(201).json({ id: eventId, name: name, stock: stockTotal });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: error.message || 'The event could not be created.' });
  } finally {
    client.release();
  }
});

module.exports = router;
