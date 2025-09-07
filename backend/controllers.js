const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { JWT_SECRET } = require('./middleware');

const DB_FILE = path.join(__dirname, 'db.json');

function readDb() {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Auth Controllers
async function signup(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db = readDb();
  const exists = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: randomUUID(), email, passwordHash };
  db.users.push(user);
  db.carts[user.id] = []; // init empty cart
  writeDb(db);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
}

// Items Controllers
function listItems(req, res) {
  const db = readDb();
  let items = db.items;
  const { minPrice, maxPrice, category, q } = req.query;
  if (minPrice) items = items.filter(i => Number(i.price) >= Number(minPrice));
  if (maxPrice) items = items.filter(i => Number(i.price) <= Number(maxPrice));
  if (category) items = items.filter(i => i.category === category);
  if (q) {
    const query = String(q).toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(query) || (i.description || '').toLowerCase().includes(query));
  }
  res.json(items);
}

function getItem(req, res) {
  const db = readDb();
  const item = db.items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
}

function createItem(req, res) {
  const { name, price, category, description, image } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Name and price required' });
  const db = readDb();
  const item = { id: randomUUID(), name, price: Number(price), category: category || 'general', description: description || '', image: image || '' };
  db.items.push(item);
  writeDb(db);
  res.status(201).json(item);
}

function updateItem(req, res) {
  const db = readDb();
  const idx = db.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  const current = db.items[idx];
  const { name, price, category, description, image } = req.body;
  const updated = { ...current, ...(name !== undefined && { name }), ...(price !== undefined && { price: Number(price) }), ...(category !== undefined && { category }), ...(description !== undefined && { description }), ...(image !== undefined && { image }) };
  db.items[idx] = updated;
  writeDb(db);
  res.json(updated);
}

function deleteItem(req, res) {
  const db = readDb();
  const before = db.items.length;
  db.items = db.items.filter(i => i.id !== req.params.id);
  if (db.items.length === before) return res.status(404).json({ error: 'Item not found' });
  writeDb(db);
  res.status(204).send();
}

// Cart Controllers (requires auth)
function getCart(req, res) {
  const db = readDb();
  const cart = db.carts[req.user.id] || [];
  res.json(cart);
}

function addToCart(req, res) {
  const { itemId, quantity } = req.body;
  const qty = Math.max(1, Number(quantity || 1));
  const db = readDb();
  const item = db.items.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const cart = db.carts[req.user.id] || [];
  const existing = cart.find(c => c.itemId === itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ itemId, quantity: qty });
  }
  db.carts[req.user.id] = cart;
  writeDb(db);
  res.json(cart);
}

function removeFromCart(req, res) {
  const { itemId, quantity } = req.body;
  const qty = Number(quantity || 1);
  const db = readDb();
  let cart = db.carts[req.user.id] || [];
  const idx = cart.findIndex(c => c.itemId === itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item not in cart' });
  if (qty >= cart[idx].quantity) {
    cart.splice(idx, 1);
  } else {
    cart[idx].quantity -= qty;
  }
  db.carts[req.user.id] = cart;
  writeDb(db);
  res.json(cart);
}

function replaceCart(req, res) {
  const { items } = req.body; // [{itemId, quantity}]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  const db = readDb();
  // validate item ids
  for (const entry of items) {
    const found = db.items.find(i => i.id === entry.itemId);
    if (!found) return res.status(400).json({ error: `Invalid itemId ${entry.itemId}` });
  }
  db.carts[req.user.id] = items.map(e => ({ itemId: e.itemId, quantity: Math.max(1, Number(e.quantity || 1)) }));
  writeDb(db);
  res.json(db.carts[req.user.id]);
}

module.exports = {
  // auth
  signup,
  login,
  // items
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  // cart
  getCart,
  addToCart,
  removeFromCart,
  replaceCart,
};


