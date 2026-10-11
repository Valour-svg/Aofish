const express = require('express');

const router = express.Router();

router.get('/dashboard', function (req, res) {
  res.json({
    totalSales: 4,
    totalOrders: 120,
    totalRevenue: '65,000.00 MVR',
    pendingOrders: 234,
    ordersToDeliver: 134
  });
});

module.exports = router;