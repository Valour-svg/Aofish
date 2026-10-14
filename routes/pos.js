const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/packaging-items', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT
         items.id,
         items.name,
         items.sku,
         items.image,
         item_types.name AS "itemTypeName",
         categories.name AS "categoryName",
         COALESCE(MIN(item_option_attributes.unit_price), 0)::int AS "unitPrice"
       FROM items
       JOIN item_types ON item_types.id = items.item_type_id
       JOIN categories ON categories.id = items.category_id
       LEFT JOIN item_options ON item_options.item_id = items.id
       LEFT JOIN item_option_attributes ON item_option_attributes.item_option_id = item_options.id
       WHERE item_types.name = 'Fees'
         AND categories.name = 'Packaging'
       GROUP BY items.id, item_types.name, categories.name
       ORDER BY items.name`
    );

    res.json({ count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Packaging items could not be loaded.' });
  }
});

router.post('/payments', async function (req, res) {
  const itemsCost = Number(req.body.itemsCost || 0);
  const packagingCost = Number(req.body.packagingCost || 0);
  const gstCost = Number(req.body.gstCost || 0);
  const grandTotal = Number(req.body.grandTotal || 0);
  const lines = req.body.lines || [];
  const eventId = req.body.eventId || null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const nextResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM payments');
    const orderCode = 'POS-' + String(nextResult.rows[0].next_id).padStart(4, '0');

    const paymentResult = await client.query(
      `INSERT INTO payments (order_code, type, items_cost, packaging_cost, gst_cost, grand_total, event_id, created_at)
       VALUES ($1, 'POS', $2, $3, $4, $5, $6, NOW()::text)
       RETURNING id, order_code`,
      [orderCode, itemsCost, packagingCost, gstCost, grandTotal, eventId]
    );
    const paymentId = paymentResult.rows[0].id;

    if (eventId) {
      await client.query(
        'UPDATE events SET sales = sales + 1, orders = orders + 1, revenue = revenue + $1 WHERE id = $2',
        [grandTotal, eventId]
      );
    }

    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      await client.query(
        `INSERT INTO payment_lines (payment_id, kind, name, detail, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [paymentId, line.kind, line.name, line.detail || '', line.quantity, line.unitPrice, line.lineTotal]
      );
      index = index + 1;
    }

    await client.query('COMMIT');
    res.status(201).json({ id: paymentId, orderCode: orderCode });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: 'The payment could not be saved.' });
  } finally {
    client.release();
  }
});

router.get('/payments', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT
         payments.id,
         payments.order_code AS "orderCode",
         payments.type,
         events.name AS "eventName",
         payments.items_cost AS "itemsCost",
         payments.packaging_cost AS "packagingCost",
         payments.gst_cost AS "gstCost",
         payments.grand_total AS "grandTotal"
       FROM payments
       LEFT JOIN events ON events.id = payments.event_id
       ORDER BY payments.id DESC`
    );
    res.json({ count: result.rows.length, payments: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Payments could not be loaded.' });
  }
});

router.get('/payments/:id', async function (req, res) {
  try {
    const paymentResult = await pool.query(
      `SELECT
         id,
         order_code AS "orderCode",
         type,
         items_cost AS "itemsCost",
         packaging_cost AS "packagingCost",
         gst_cost AS "gstCost",
         grand_total AS "grandTotal"
       FROM payments
       WHERE id = $1`,
      [req.params.id]
    );

    if (paymentResult.rows.length === 0) {
      res.status(404).json({ message: 'Payment was not found.' });
      return;
    }

    const linesResult = await pool.query(
      `SELECT kind, name, detail, quantity, unit_price AS "unitPrice", line_total AS "lineTotal"
       FROM payment_lines
       WHERE payment_id = $1
       ORDER BY id`,
      [req.params.id]
    );

    const payment = paymentResult.rows[0];
    payment.lines = linesResult.rows;
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Payment could not be loaded.' });
  }
});

module.exports = router;