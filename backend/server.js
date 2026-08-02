const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'ScanStock API is running smoothly!' });
});

// Sample Test Route to fetch products from XAMPP MySQL
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// 1. Lookup Product by Barcode
app.get('/api/products/scan/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const [rows] = await db.query('SELECT * FROM products WHERE barcode = ?', [barcode]);

    if (rows.length === 0) {
      return res.json({ found: false, barcode });
    }

    res.json({ found: true, product: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add New Product
app.post('/api/products', async (req, res) => {
  try {
    const { barcode, name, price, stock_quantity, low_stock_threshold } = req.body;
    const [result] = await db.query(
      'INSERT INTO products (barcode, name, price, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
      [barcode, name, price || 0, stock_quantity || 0, low_stock_threshold || 10]
    );
    res.json({ success: true, id: result.insertId, message: 'Product added successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Stock Adjustment (IN / OUT)
app.post('/api/products/stock-adjust', async (req, res) => {
  try {
    const { productId, type, quantity } = req.body; // type: 'IN' or 'OUT'
    const adjustQty = type === 'IN' ? quantity : -quantity;

    await db.query(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
      [adjustQty, productId]
    );

    res.json({ success: true, message: `Stock updated (${type})` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ScanStock Backend running on http://localhost:${PORT}`);
});