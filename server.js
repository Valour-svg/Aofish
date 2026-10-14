const express = require('express');
const cors = require('cors');

const loginRoutes = require('./routes/login');
const dashboardRoutes = require('./routes/dashboard');
const databaseRoutes = require('./routes/database');
const posRoutes = require('./routes/pos');
const eventRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', function (req, res) {
  res.json({ ok: true });
});

app.use('/api', loginRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', databaseRoutes);
app.use('/api', posRoutes);
app.use('/api', eventRoutes);


app.listen(PORT, function () {
  console.log('Server listening on http://localhost:' + PORT);
});