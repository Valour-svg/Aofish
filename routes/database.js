const express = require('express');
const pool = require('../db');

const router = express.Router();

function stockStatusFromCount(stock) {
  if (stock === 0) {
    return 'Out of Stock';
  }

  if (stock < 25) {
    return 'Low Stock';
  }

  if (stock > 100) {
    return 'Overstocked';
  }

  return 'In stock';
}

router.get('/items', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT
         items.id,
         items.name,
         items.sku,
         items.item_type_id AS "itemTypeId",
         item_types.name AS "itemTypeName",
         items.category_id AS "categoryId",
         categories.name AS "categoryName",
         items.image,
         items.designation,
         items.gst,
         items.packaging,
         items.status,
         items.updated,
         COUNT(item_options.id)::int AS "optionCount"
       FROM items
       JOIN item_types ON item_types.id = items.item_type_id
       JOIN categories ON categories.id = items.category_id
       LEFT JOIN item_options ON item_options.item_id = items.id
       GROUP BY items.id, item_types.name, categories.name
       ORDER BY items.id`
    );

    res.json({ count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Items could not be loaded.' });
  }
});

router.get('/items/:id', async function (req, res) {
  const itemId = Number(req.params.id);

  try {
    const itemResult = await pool.query(
      `SELECT
         items.id,
         items.name,
         items.sku,
         items.item_type_id AS "itemTypeId",
         item_types.name AS "itemTypeName",
         items.category_id AS "categoryId",
         categories.name AS "categoryName",
         items.image,
         items.designation,
         items.gst,
         items.packaging,
         items.status,
         items.updated
       FROM items
       JOIN item_types ON item_types.id = items.item_type_id
       JOIN categories ON categories.id = items.category_id
       WHERE items.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({ message: 'Item was not found.' });
      return;
    }

    const optionResult = await pool.query(
      `SELECT
         item_options.id AS "itemOptionId",
         item_options.option_id AS "optionId",
         options.name AS "optionName",
         attributes.id AS "attributeId",
         attributes.name AS "attributeName",
         item_option_attributes.stock,
         item_option_attributes.unit_price AS "unitPrice",
         item_option_attributes.fee
       FROM item_options
       JOIN options ON options.id = item_options.option_id
       LEFT JOIN item_option_attributes ON item_option_attributes.item_option_id = item_options.id
       LEFT JOIN attributes ON attributes.id = item_option_attributes.attribute_id
       WHERE item_options.item_id = $1
       ORDER BY item_options.id, attributes.id`,
      [itemId]
    );

    const optionDetails = [];
    let index = 0;

    while (index < optionResult.rows.length) {
      const row = optionResult.rows[index];
      let option = null;
      let optionIndex = 0;

      while (optionIndex < optionDetails.length) {
        if (optionDetails[optionIndex].optionId === row.optionId) {
          option = optionDetails[optionIndex];
          break;
        }
        optionIndex = optionIndex + 1;
      }

      if (option === null) {
        option = {
          optionId: row.optionId,
          optionName: row.optionName,
          attributes: []
        };
        optionDetails.push(option);
      }

      if (row.attributeId !== null) {
        option.attributes.push({
          id: row.attributeId,
          name: row.attributeName,
          stock: row.stock,
          unitPrice: row.unitPrice,
          fee: row.fee,
          stockStatus: stockStatusFromCount(row.stock)
        });
      }

      index = index + 1;
    }

    const item = itemResult.rows[0];
    item.optionCount = optionDetails.length;
    item.optionDetails = optionDetails;
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Item could not be loaded.' });
  }
});

router.get('/item-types', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT
         item_types.id,
         item_types.name,
         COUNT(items.id)::int AS "itemCount"
       FROM item_types
       LEFT JOIN items ON items.item_type_id = item_types.id
       GROUP BY item_types.id
       ORDER BY item_types.id`
    );

    res.json({ count: result.rows.length, itemTypes: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Item types could not be loaded.' });
  }
});

router.post('/item-types', async function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO item_types (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'That item type already exists.' });
  }
});

router.get('/categories', async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT
         categories.id,
         categories.name,
         COUNT(items.id)::int AS "itemCount"
       FROM categories
       LEFT JOIN items ON items.category_id = categories.id
       GROUP BY categories.id
       ORDER BY categories.id`
    );

    res.json({ count: result.rows.length, categories: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Categories could not be loaded.' });
  }
});

router.post('/categories', async function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'That category already exists.' });
  }
});

router.get('/options', async function (req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM options ORDER BY id');
    res.json({ count: result.rows.length, options: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Options could not be loaded.' });
  }
});

router.post('/options', async function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO options (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'That option already exists.' });
  }
});

router.get('/attributes', async function (req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM attributes ORDER BY id');
    res.json({ count: result.rows.length, attributes: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Attributes could not be loaded.' });
  }
});

router.post('/attributes', async function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO attributes (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'That attribute already exists.' });
  }
});

module.exports = router;
