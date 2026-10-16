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

module.exports = router;
