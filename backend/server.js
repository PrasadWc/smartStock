const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// =====================================================
// BASIC HEALTH CHECK
// =====================================================

app.get('/', async (req, res) => {
    try {
        // Test database connection
        const connection = await db.getConnection();
        connection.release();
        
        res.json({
            success: true,
            message: 'ScanStock API is running smoothly!',
            database: {
                status: 'connected',
                message: 'Database connection successful'
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        
        res.status(503).json({
            success: false,
            message: 'ScanStock API is running but database connection failed',
            database: {
                status: 'disconnected',
                message: error.message
            }
        });
    }
});


// =====================================================
// GET ALL CATEGORIES
// =====================================================

app.get('/api/categories', async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT 
                id,
                category_name
            FROM categories
            ORDER BY category_name ASC
        `);

        res.json({
            success: true,
            categories: rows
        });

    } catch (error) {

        console.error('Get categories error:', error);

        res.status(500).json({
            success: false,
            categories: [],
            error: error.message
        });
    }
});


// =====================================================
// GET ALL PRODUCTS
// =====================================================

app.get('/api/products', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.id,
                p.article_number,
                p.barcode,
                p.name,
                p.category_id,
                c.category_name,
                p.part_number,
                p.price,
                p.stock_quantity,
                p.low_stock_threshold,
                p.special_notes,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
            ORDER BY p.id DESC
        `);

        res.json({
            success: true,
            products: rows
        });

    } catch (error) {

        console.error('Get products error:', error);

        res.status(500).json({
            success: false,
            products: [],
            error: error.message
        });
    }
});


// =====================================================
// SCAN PRODUCT BY BARCODE
// =====================================================

app.get('/api/products/scan/:barcode', async (req, res) => {

    try {

        const { barcode } = req.params;

        const [rows] = await db.query(`
            SELECT
                p.id,
                p.article_number,
                p.barcode,
                p.name,
                p.category_id,
                c.category_name,
                p.part_number,
                p.price,
                p.stock_quantity,
                p.low_stock_threshold,
                p.special_notes,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE p.barcode = ?
        `, [barcode]);

        if (rows.length === 0) {

            return res.json({
                found: false,
                barcode: barcode
            });
        }

        res.json({
            found: true,
            product: rows[0]
        });

    } catch (error) {

        console.error('Scan error:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// GET PRODUCT BY ID
// =====================================================

app.get('/api/products/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT
                p.id,
                p.article_number,
                p.barcode,
                p.name,
                p.category_id,
                c.category_name,
                p.part_number,
                p.price,
                p.stock_quantity,
                p.low_stock_threshold,
                p.special_notes,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: rows[0]
        });

    } catch (error) {

        console.error('Get product error:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// ADD NEW PRODUCT
// =====================================================

app.post('/api/products', async (req, res) => {

    try {

        const {
            article_number,
            barcode,
            name,
            category_id,
            part_number,
            price,
            stock_quantity,
            low_stock_threshold,
            special_notes
        } = req.body;


        // Required fields
        if (!article_number || !barcode || !name) {

            return res.status(400).json({
                success: false,
                message: 'Article number, barcode and product name are required.'
            });
        }


        const [result] = await db.query(`
            INSERT INTO products
            (
                article_number,
                barcode,
                name,
                category_id,
                part_number,
                price,
                stock_quantity,
                low_stock_threshold,
                special_notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            article_number,
            barcode,
            name,
            category_id || null,
            part_number || null,
            price || 0,
            stock_quantity || 0,
            low_stock_threshold || 10,
            special_notes || null
        ]);


        res.json({
            success: true,
            id: result.insertId,
            message: 'Product added successfully!'
        });

    } catch (error) {

        console.error('Add product error:', error);

        // Duplicate article number / barcode
        if (error.code === 'ER_DUP_ENTRY') {

            return res.status(400).json({
                success: false,
                message: 'Article number or barcode already exists.'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// UPDATE PRODUCT
// =====================================================

app.put('/api/products/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const {
            article_number,
            barcode,
            name,
            category_id,
            part_number,
            price,
            low_stock_threshold,
            special_notes
        } = req.body;


        await db.query(`
            UPDATE products
            SET
                article_number = ?,
                barcode = ?,
                name = ?,
                category_id = ?,
                part_number = ?,
                price = ?,
                low_stock_threshold = ?,
                special_notes = ?
            WHERE id = ?
        `, [
            article_number,
            barcode,
            name,
            category_id || null,
            part_number || null,
            price || 0,
            low_stock_threshold || 10,
            special_notes || null,
            id
        ]);


        res.json({
            success: true,
            message: 'Product updated successfully!'
        });

    } catch (error) {

        console.error('Update product error:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// STOCK ADJUSTMENT
// =====================================================
//
// IN  -> Increase stock
// OUT -> Decrease stock
//
// Example:
//
// Current stock = 4
//
// OUT 1
// products.stock_quantity = 3
//
// inventory_transactions:
// OUT | 1
//
// Later IN 1
// products.stock_quantity = 4
//
// inventory_transactions:
// IN | 1
//
// NOTHING IS OVERWRITTEN.
// Every operation becomes a new history record.
// =====================================================

app.post('/api/products/stock-adjust', async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            productId,
            type,
            quantity,
            notes
        } = req.body;

        console.log('Stock adjustment request:', {
            productId,
            type,
            quantity
        });

        // Validate input
        if (!productId || !type || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, type and quantity are required.'
            });
        }

        if (type !== 'IN' && type !== 'OUT') {
            return res.status(400).json({
                success: false,
                message: 'Type must be IN or OUT.'
            });
        }

        const qty = parseInt(quantity);

        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0.'
            });
        }

        await connection.beginTransaction();

        // Get current product stock
        const [products] = await connection.query(
            `SELECT stock_quantity
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [productId]
        );

        if (products.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        const previousStock = Number(products[0].stock_quantity);

        let newStock;

        if (type === 'IN') {
            newStock = previousStock + qty;
        } else {
            // OUT
            if (previousStock < qty) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Cannot remove ${qty}. Current stock is ${previousStock}.`
                });
            }

            newStock = previousStock - qty;
        }

        // Update products table
        await connection.query(
            `UPDATE products
             SET stock_quantity = ?
             WHERE id = ?`,
            [newStock, productId]
        );

        // IMPORTANT:
        // Your user_id is NOT NULL.
        //
        // For now we use user ID 1.
        // Make sure user ID 1 exists in your users table.
        //
        await connection.query(
            `INSERT INTO inventory_transactions
            (
                product_id,
                user_id,
                type,
                quantity,
                previous_stock,
                new_stock,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                productId,
                1,
                type,
                qty,
                previousStock,
                newStock,
                notes || null
            ]
        );

        await connection.commit();

        console.log(
            `Stock updated successfully: ${previousStock} -> ${newStock}`
        );

        res.json({
            success: true,
            message: `Stock ${type === 'IN' ? 'added' : 'removed'} successfully.`,
            previousStock,
            quantity: qty,
            newStock
        });

    } catch (error) {

        await connection.rollback();

        console.error('❌ Stock adjustment error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update stock quantity.',
            error: error.message
        });

    } finally {
        connection.release();
    }
});

// =====================================================
// GET PRODUCT TRANSACTION HISTORY
// =====================================================
// =====================================================
// INVENTORY HISTORY
// =====================================================

app.get('/api/inventory-history', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                h.id,
                h.product_id,
                h.user_id,
                h.type,
                h.quantity,
                h.previous_stock,
                h.new_stock,
                h.notes,
                h.created_at,

                p.article_number,
                p.barcode,
                p.name AS product_name,

                u.username

            FROM inventory_transactions h

            LEFT JOIN products p
                ON h.product_id = p.id

            LEFT JOIN users u
                ON h.user_id = u.id

            ORDER BY h.created_at DESC, h.id DESC
        `);

        res.json({
            success: true,
            history: rows
        });

    } catch (error) {
        console.error('Inventory history error:', error);

        res.status(500).json({
            success: false,
            history: [],
            error: error.message
        });
    }
});

app.get('/api/products/:id/transactions', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT
                t.id,
                t.product_id,
                t.user_id,
                t.type,
                t.quantity,
                t.notes,
                t.created_at,
                u.username
            FROM inventory_transactions t
            LEFT JOIN users u
                ON t.user_id = u.id
            WHERE t.product_id = ?
            ORDER BY t.created_at DESC
        `, [id]);


        res.json({
            success: true,
            transactions: rows
        });

    } catch (error) {

        console.error('Transaction history error:', error);

        res.status(500).json({
            success: false,
            transactions: [],
            error: error.message
        });
    }
});


// =====================================================
// DELETE PRODUCT
// =====================================================

app.delete('/api/products/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM products WHERE id = ?',
            [id]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }


        res.json({
            success: true,
            message: 'Product deleted successfully.'
        });

    } catch (error) {

        console.error('Delete product error:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(`
========================================
🚀 ScanStock Backend
========================================
Server: http://localhost:${PORT}
Database: XAMPP MySQL
========================================
`);

});
