const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { authRouter, itemsRouter, cartRouter } = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], items: [], carts: {} }, null, 2));
}

// Simple health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routers
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/cart', cartRouter);

// Serve frontend static files
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// SPA fallback to index.html for non-API routes
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server listening on y
    http://localhost:${PORT}`);
});


