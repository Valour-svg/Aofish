const express = require('express');
const items = require('../data/items');
const itemTypes = require('../data/itemTypes');
const categories = require('../data/categories');
const options = require('../data/options');
const attributes = require('../data/attributes');

const router = express.Router();

function findById(list, id) {
  let index = 0;
  while (index < list.length) {
    if (list[index].id === id) {
      return list[index];
    }
    index = index + 1;
  }
  return null;
}

function countItems(list, fieldName, id) {
  let total = 0;
  let index = 0;

  while (index < list.length) {
    if (list[index][fieldName] === id) {
      total = total + 1;
    }
    index = index + 1;
  }

  return total;
}

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

function buildOptionDetails(item) {
  const details = [];
  const optionList = item.options || [];
  let index = 0;

  while (index < optionList.length) {
    const entry = optionList[index];
    const option = findById(options, entry.optionId);
    const attributeRows = [];
    const attributeList = entry.attributes || [];
    let attributeIndex = 0;

    while (attributeIndex < attributeList.length) {
      const attributeEntry = attributeList[attributeIndex];
      const attribute = findById(attributes, attributeEntry.attributeId);

      if (attribute !== null) {
        attributeRows.push({
          id: attribute.id,
          name: attribute.name,
          stock: attributeEntry.stock,
          unitPrice: attributeEntry.unitPrice,
          fee: attributeEntry.fee,
          stockStatus: stockStatusFromCount(attributeEntry.stock)
        });
      }

      attributeIndex = attributeIndex + 1;
    }

    details.push({
      optionId: entry.optionId,
      optionName: option ? option.name : 'Missing option',
      attributes: attributeRows
    });

    index = index + 1;
  }

  return details;
}

function buildSummary(item) {
  const itemType = findById(itemTypes, item.itemTypeId);
  const category = findById(categories, item.categoryId);
  const optionList = item.options || [];

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    itemTypeId: item.itemTypeId,
    itemTypeName: itemType ? itemType.name : 'Missing type',
    categoryId: item.categoryId,
    categoryName: category ? category.name : 'Missing category',
    image: item.image,
    optionCount: optionList.length,
    designation: item.designation,
    gst: item.gst,
    packaging: item.packaging,
    status: item.status,
    updated: item.updated
  };
}

router.get('/items', function (req, res) {
  const rows = [];
  let index = 0;

  while (index < items.length) {
    rows.push(buildSummary(items[index]));
    index = index + 1;
  }

  res.json({ count: rows.length, items: rows });
});

router.get('/items/:id', function (req, res) {
  const itemId = Number(req.params.id);
  const item = findById(items, itemId);

  if (item === null) {
    res.status(404).json({ message: 'Item was not found.' });
    return;
  }

  const summary = buildSummary(item);
  summary.optionDetails = buildOptionDetails(item);
  res.json(summary);
});

function nextId(list) {
  let highest = 0;
  let index = 0;

  while (index < list.length) {
    if (list[index].id > highest) {
      highest = list[index].id;
    }
    index = index + 1;
  }

  return highest + 1;
}

function nameExists(list, name) {
  const needle = name.toLowerCase();
  let index = 0;

  while (index < list.length) {
    if (list[index].name.toLowerCase() === needle) {
      return true;
    }
    index = index + 1;
  }

  return false;
}

router.post('/item-types', function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  if (nameExists(itemTypes, name)) {
    res.status(400).json({ message: 'That item type already exists.' });
    return;
  }

  const record = { id: nextId(itemTypes), name: name };
  itemTypes.push(record);
  res.status(201).json(record);
});

router.post('/categories', function (req, res) {
  const name = (req.body.name || '').trim();

  if (name === '') {
    res.status(400).json({ message: 'A name is required.' });
    return;
  }

  if (nameExists(categories, name)) {
    res.status(400).json({ message: 'That category already exists.' });
    return;
  }

  const record = { id: nextId(categories), name: name };
  categories.push(record);
  res.status(201).json(record);
});

router.get('/item-types', function (req, res) {
  const rows = [];
  let index = 0;

  while (index < itemTypes.length) {
    const itemType = itemTypes[index];
    rows.push({
      id: itemType.id,
      name: itemType.name,
      itemCount: countItems(items, 'itemTypeId', itemType.id)
    });
    index = index + 1;
  }

  res.json({ count: rows.length, itemTypes: rows });
});

router.get('/categories', function (req, res) {
  const rows = [];
  let index = 0;

  while (index < categories.length) {
    const category = categories[index];
    rows.push({
      id: category.id,
      name: category.name,
      itemCount: countItems(items, 'categoryId', category.id)
    });
    index = index + 1;
  }

  res.json({ count: rows.length, categories: rows });
});

module.exports = router;
