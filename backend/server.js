const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ MYSQL CONNECTION ============
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_ironcolol',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Buat tabel jika belum ada
async function initDatabase() {
    try {
        // Tabel products
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'snack',
                price INT NOT NULL,
                description TEXT,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabel orders
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                items JSON,
                total INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_address TEXT,
                table_number VARCHAR(50),
                note TEXT,
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabel cafe_tables
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS cafe_tables (
                id INT PRIMARY KEY AUTO_INCREMENT,
                number INT UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'available',
                is_active BOOLEAN DEFAULT TRUE,
                qr_code TEXT,
                qr_code_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ MySQL tables ready');
        
        // Insert initial tables if empty
        const [tables] = await promisePool.execute('SELECT COUNT(*) as count FROM cafe_tables');
        if (tables[0].count === 0) {
            for (let i = 1; i <= 10; i++) {
                await promisePool.execute(
                    'INSERT INTO cafe_tables (number, status) VALUES (?, ?)',
                    [i, 'available']
                );
            }
            console.log('Initial tables seeded');
        }
        
        // Insert initial products if empty
        const [products] = await promisePool.execute('SELECT COUNT(*) as count FROM products');
        if (products[0].count === 0) {
            const initialProducts = [
                ['Espresso', 'kopi', 25000, 'Kopi hitam pekat dengan crema', 'https://via.placeholder.com/300x200?text=Espresso'],
                ['Cappuccino', 'kopi', 32000, 'Espresso dengan busa susu', 'https://via.placeholder.com/300x200?text=Cappuccino'],
                ['French Fries', 'snack', 18000, 'Kentang goreng renyah', 'https://via.placeholder.com/300x200?text=French+Fries'],
                ['Nasi Goreng', 'makanan', 35000, 'Nasi goreng spesial', 'https://via.placeholder.com/300x200?text=Nasi+Goreng']
            ];
            for (const product of initialProducts) {
                await promisePool.execute(
                    'INSERT INTO products (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
                    product
                );
            }
            console.log('Initial products seeded');
        }
        
    } catch (error) {
        console.error('❌ Database init error:', error);
    }
}

// ============ MULTER CONFIGURATION ============
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Hanya gambar yang diperbolehkan!'));
    }
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
app.use('/uploads', express.static('uploads'));

// ============ ADMIN AUTH ============
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'admin_token_' + Date.now() });
    } else {
        res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM products ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID' });
    }
});

app.get('/api/products/category/:category', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM products WHERE category = ?', [req.params.category]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, category, price, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nama produk harus diisi!' });
        }
        
        if (!price || price <= 0) {
            return res.status(400).json({ error: 'Harga tidak valid!' });
        }
        
        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        const [result] = await promisePool.execute(
            'INSERT INTO products (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
            [name, category || 'snack', parseInt(price), description || '', imageUrl]
        );
        
        console.log('Product added:', name);
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, category, price, description } = req.body;
        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        if (imageUrl) {
            await promisePool.execute(
                'UPDATE products SET name=?, category=?, price=?, description=?, image=? WHERE id=?',
                [name, category, parseInt(price), description, imageUrl, req.params.id]
            );
        } else {
            await promisePool.execute(
                'UPDATE products SET name=?, category=?, price=?, description=? WHERE id=?',
                [name, category, parseInt(price), description, req.params.id]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await promisePool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ============ ORDER ROUTES ============
app.post('/api/orders', async (req, res) => {
    try {
        const { items, total, customerName, customerPhone, customerAddress, tableNumber, note, paymentMethod } = req.body;
        const [result] = await promisePool.execute(
            'INSERT INTO orders (items, total, customer_name, customer_phone, customer_address, table_number, note, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [JSON.stringify(items), total, customerName, customerPhone, customerAddress, tableNumber, note, paymentMethod]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = rows.map(order => ({ ...order, items: JSON.parse(order.items || '[]') }));
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await promisePool.execute('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// ============ TABLE ROUTES ============
app.get('/api/tables', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM cafe_tables ORDER BY number ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

app.get('/api/tables/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.execute('SELECT * FROM cafe_tables WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Table not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID' });
    }
});

app.post('/api/admin/tables', async (req, res) => {
    try {
        const { number, status } = req.body;
        
        if (!number) {
            return res.status(400).json({ error: 'Nomor meja harus diisi!' });
        }
        
        const [existing] = await promisePool.execute('SELECT * FROM cafe_tables WHERE number = ?', [number]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Nomor meja sudah ada!' });
        }
        
        const [result] = await promisePool.execute(
            'INSERT INTO cafe_tables (number, status) VALUES (?, ?)',
            [number, status || 'available']
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Error adding table:', error);
        res.status(500).json({ error: 'Failed to add table' });
    }
});

app.put('/api/admin/tables/:id', async (req, res) => {
    try {
        await promisePool.execute('UPDATE cafe_tables SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.put('/api/admin/tables/:id/qr', async (req, res) => {
    try {
        await promisePool.execute(
            'UPDATE cafe_tables SET qr_code = ?, qr_code_url = ? WHERE id = ?',
            [req.body.qrCode, req.body.qrCodeUrl, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/admin/tables/:id', async (req, res) => {
    try {
        await promisePool.execute('DELETE FROM cafe_tables WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ START SERVER ============
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`🚀 Cafe IronColol Server Running!`);
        console.log(`========================================`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`📡 API: http://localhost:${PORT}/api/products`);
        console.log(`🛢️  MySQL: Connected`);
        console.log(`📊 phpMyAdmin: http://localhost/phpmyadmin`);
        console.log(`========================================\n`);
    });
});

module.exports = app;