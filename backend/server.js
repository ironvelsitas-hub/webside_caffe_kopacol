const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// ============ MULTER CONFIGURATION ============
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya gambar yang diperbolehkan!'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ DATABASE SEDERHANA (Memory + File) ============
const DB_PATH = path.join(__dirname, 'database.json');

// Default data
let database = {
    products: [
        { id: 1, name: "Espresso", category: "kopi", price: 25000, image: "https://via.placeholder.com/300x200?text=Espresso", description: "Kopi hitam pekat" },
        { id: 2, name: "Cappuccino", category: "kopi", price: 32000, image: "https://via.placeholder.com/300x200?text=Cappuccino", description: "Espresso dengan busa susu" },
        { id: 3, name: "French Fries", category: "snack", price: 18000, image: "https://via.placeholder.com/300x200?text=French+Fries", description: "Kentang goreng renyah" },
        { id: 4, name: "Nasi Goreng", category: "makanan", price: 35000, image: "https://via.placeholder.com/300x200?text=Nasi+Goreng", description: "Nasi goreng spesial" }
    ],
    orders: [],
    tables: Array.from({ length: 10 }, (_, i) => ({ id: i+1, number: i+1, status: 'available', isActive: true }))
};

// Load database from file
function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            database = JSON.parse(data);
            console.log('Database loaded from file');
        } else {
            saveDatabase();
            console.log('New database created');
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
        console.log('Database saved to file');
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

function readDB() { return database; }
function writeDB(data) { database = data; saveDatabase(); }

// Load database on start
loadDatabase();

// ============ ADMIN AUTH - FIXED ============
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt - Username:', username);
    
    // Cek kredensial
    if (username === 'admin' && password === 'admin123') {
        const token = 'admin_token_' + Date.now();
        console.log('Login success');
        res.json({ 
            success: true, 
            token: token,
            message: 'Login successful' 
        });
    } else {
        console.log('Login failed - Invalid credentials');
        res.status(401).json({ 
            success: false, 
            error: 'Username atau password salah!' 
        });
    }
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', (req, res) => {
    try {
        const db = readDB();
        res.json(db.products);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', (req, res) => {
    const db = readDB();
    const product = db.products.find(p => p.id == req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, category, price, description } = req.body;
        
        console.log('Received product data:', { name, category, price, description });
        console.log('File:', req.file);
        
        if (!name) {
            return res.status(400).json({ error: 'Nama produk harus diisi!' });
        }
        
        if (!price || price <= 0) {
            return res.status(400).json({ error: 'Harga tidak valid!' });
        }
        
        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        const newProduct = {
            id: Date.now(),
            name: name,
            category: category || 'snack',
            price: parseInt(price),
            description: description || '',
            image: imageUrl
        };
        
        const db = readDB();
        db.products.push(newProduct);
        writeDB(db);
        
        console.log('Product added:', newProduct);
        res.status(201).json({ success: true, product: newProduct });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, category, price, description } = req.body;
        
        console.log('Updating product ID:', id);
        
        const db = readDB();
        const index = db.products.findIndex(p => p.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        let imageUrl = req.file ? `/uploads/${req.file.filename}` : db.products[index].image;
        
        db.products[index] = {
            ...db.products[index],
            name: name || db.products[index].name,
            category: category || db.products[index].category,
            price: parseInt(price) || db.products[index].price,
            description: description || db.products[index].description,
            image: imageUrl
        };
        
        writeDB(db);
        console.log('Product updated:', db.products[index]);
        res.json({ success: true, product: db.products[index] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const db = readDB();
        const id = parseInt(req.params.id);
        db.products = db.products.filter(p => p.id !== id);
        writeDB(db);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ============ ORDER ROUTES ============
app.post('/api/orders', (req, res) => {
    try {
        const db = readDB();
        const newOrder = {
            id: Date.now(),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        db.orders.push(newOrder);
        writeDB(db);
        res.json(newOrder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders', (req, res) => {
    const db = readDB();
    res.json(db.orders);
});

app.put('/api/orders/:id', (req, res) => {
    const db = readDB();
    const index = db.orders.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db.orders[index].status = req.body.status;
        writeDB(db);
        res.json(db.orders[index]);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

app.put('/api/orders/:id/confirm-payment', (req, res) => {
    const db = readDB();
    const index = db.orders.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db.orders[index].paymentStatus = 'paid';
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// ============ TABLE ROUTES ============
app.get('/api/tables', (req, res) => {
    const db = readDB();
    res.json(db.tables);
});

app.post('/api/admin/tables', (req, res) => {
    const db = readDB();
    const { number, status } = req.body;
    
    if (db.tables.some(t => t.number == number)) {
        return res.status(400).json({ error: 'Nomor meja sudah ada!' });
    }
    
    const newTable = {
        id: Date.now(),
        number: parseInt(number),
        status: status || 'available',
        isActive: true
    };
    
    db.tables.push(newTable);
    writeDB(db);
    res.status(201).json({ success: true, table: newTable });
});

app.put('/api/admin/tables/:id', (req, res) => {
    const db = readDB();
    const index = db.tables.findIndex(t => t.id == req.params.id);
    if (index !== -1) {
        db.tables[index].status = req.body.status;
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Table not found' });
    }
});

app.delete('/api/admin/tables/:id', (req, res) => {
    const db = readDB();
    const index = db.tables.findIndex(t => t.id == req.params.id);
    if (index !== -1) {
        db.tables.splice(index, 1);
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Table not found' });
    }
});

// ============ USER AUTH ============
app.post('/api/user/login', (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
        return res.status(400).json({ success: false, error: 'Nomor telepon tidak valid!' });
    }
    res.json({ success: true, token: 'user_token_' + Date.now(), phone: phone });
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Cafe IronColol Server Running!`);
    console.log(`========================================`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/products`);
    console.log(`🔐 Admin Login: admin / admin123`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`========================================\n`);
});

module.exports = app;