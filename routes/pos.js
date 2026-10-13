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

module.exports = router;
