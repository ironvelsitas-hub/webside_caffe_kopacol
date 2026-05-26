const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// Middleware - increase limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ MULTER CONFIGURATION FOR IMAGE UPLOAD ============
// Hanya aktif jika bukan production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';
let upload = null;

if (!isProduction) {
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

    upload = multer({ 
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: fileFilter
    });

    // Serve uploaded files statically (only local)
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ============ MONGODB CONNECTION ============
// Untuk lokal (MongoDB Compass)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cafe-ironcolol';

let db;
let productsCollection;
let ordersCollection;
let tablesCollection;

async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        db = client.db(DB_NAME);
        productsCollection = db.collection('products');
        ordersCollection = db.collection('orders');
        tablesCollection = db.collection('tables');
        
        // Inisialisasi data awal jika kosong
        await initCollections();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
    }
}

async function initCollections() {
    // Products
    const productCount = await productsCollection.countDocuments();
    if (productCount === 0) {
        const initialProducts = [
            { name: "Espresso", category: "kopi", price: 25000, image: "https://via.placeholder.com/300x200?text=Espresso", description: "Kopi hitam pekat dengan crema", createdAt: new Date() },
            { name: "Cappuccino", category: "kopi", price: 32000, image: "https://via.placeholder.com/300x200?text=Cappuccino", description: "Espresso dengan busa susu", createdAt: new Date() },
            { name: "French Fries", category: "snack", price: 18000, image: "https://via.placeholder.com/300x200?text=French+Fries", description: "Kentang goreng renyah", createdAt: new Date() },
            { name: "Nasi Goreng", category: "makanan", price: 35000, image: "https://via.placeholder.com/300x200?text=Nasi+Goreng", description: "Nasi goreng spesial", createdAt: new Date() }
        ];
        await productsCollection.insertMany(initialProducts);
        console.log('Initial products seeded');
    }
    
    // Tables
    const tableCount = await tablesCollection.countDocuments();
    if (tableCount === 0) {
        const initialTables = [];
        for (let i = 1; i <= 10; i++) {
            initialTables.push({ number: i, status: 'available', isActive: true, createdAt: new Date() });
        }
        await tablesCollection.insertMany(initialTables);
        console.log('Initial tables seeded');
    }
}

// ============ ADMIN AUTH ============
function adminAuth(req, res, next) {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized access - No token' });
    }
    
    if (token && token.includes('admin_token_')) {
        return next();
    }
    
    return res.status(401).json({ error: 'Unauthorized access - Invalid token' });
}

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        res.json({ 
            success: true, 
            token: 'admin_token_' + Date.now(),
            message: 'Login successful' 
        });
    } else {
        res.status(401).json({ 
            success: false,
            error: 'Username atau password salah!' 
        });
    }
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', async (req, res) => {
    try {
        const products = await productsCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await productsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID' });
    }
});

app.get('/api/products/category/:category', async (req, res) => {
    try {
        const products = await productsCollection.find({ category: req.params.category }).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST product (tambah produk baru)
app.post('/api/products', async (req, res) => {
    try {
        const { name, category, price, description, image } = req.body;
        
        // Validasi input
        if (!name) {
            return res.status(400).json({ error: 'Nama produk harus diisi!' });
        }
        
        if (!price || price <= 0) {
            return res.status(400).json({ error: 'Harga tidak valid!' });
        }
        
        const newProduct = {
            name: name,
            category: category || 'snack',
            price: parseInt(price),
            description: description || '',
            image: image || 'https://via.placeholder.com/300x200?text=Product',
            createdAt: new Date()
        };
        
        const result = await productsCollection.insertOne(newProduct);
        console.log('Product added:', newProduct.name);
        res.status(201).json({ 
            success: true, 
            product: { ...newProduct, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT (update) product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, category, price, description, image } = req.body;
        const result = await productsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { name, category, price: parseInt(price), description, image } }
        );
        
        if (result.matchedCount) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount) {
            res.json({ message: 'Product deleted' });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ============ ORDER ROUTES ============
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = {
            ...req.body,
            status: 'pending',
            createdAt: new Date()
        };
        const result = await ordersCollection.insertOne(newOrder);
        res.json({ ...newOrder, _id: result.insertedId });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await ordersCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await ordersCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: req.body.status } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// ============ TABLE MANAGEMENT ROUTES ============
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await tablesCollection.find().sort({ number: 1 }).toArray();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

app.get('/api/tables/:id', async (req, res) => {
    try {
        const table = await tablesCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (table) {
            res.json(table);
        } else {
            res.status(404).json({ error: 'Table not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Invalid ID' });
    }
});

// Add new table (admin only)
app.post('/api/admin/tables', adminAuth, async (req, res) => {
    try {
        const { number, status } = req.body;
        
        if (!number) {
            return res.status(400).json({ error: 'Nomor meja harus diisi!' });
        }
        
        // Check if table number already exists
        const existing = await tablesCollection.findOne({ number: parseInt(number) });
        if (existing) {
            return res.status(400).json({ error: 'Nomor meja sudah ada!' });
        }
        
        const newTable = {
            number: parseInt(number),
            status: status || 'available',
            isActive: true,
            qrCode: null,
            qrCodeUrl: null,
            createdAt: new Date()
        };
        
        const result = await tablesCollection.insertOne(newTable);
        res.status(201).json({ success: true, table: { ...newTable, _id: result.insertedId } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add table' });
    }
});

// Update table (admin only)
app.put('/api/admin/tables/:id', adminAuth, async (req, res) => {
    try {
        const updateData = {};
        if (req.body.status) updateData.status = req.body.status;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
        
        const result = await tablesCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Table not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Update table QR code (admin only)
app.put('/api/admin/tables/:id/qr', adminAuth, async (req, res) => {
    try {
        const result = await tablesCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { qrCode: req.body.qrCode, qrCodeUrl: req.body.qrCodeUrl, updatedAt: new Date() } }
        );
        
        if (result.matchedCount) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Table not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Delete table (admin only)
app.delete('/api/admin/tables/:id', adminAuth, async (req, res) => {
    try {
        const result = await tablesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount) {
            res.json({ success: true, message: 'Table deleted' });
        } else {
            res.status(404).json({ error: 'Table not found' });
        }
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
// Start server with MongoDB connection
connectDB().then(() => {
    if (!isProduction) {
        app.listen(PORT, () => {
            console.log(`\n========================================`);
            console.log(`🚀 Cafe IronColol Server Running!`);
            console.log(`========================================`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api/products`);
            console.log(`🍃 MongoDB: Connected to ${DB_NAME}`);
            console.log(`📊 Compass: mongodb://localhost:27017`);
            console.log(`========================================\n`);
        });
    } else {
        console.log(`Server ready for Vercel`);
    }
});

module.exports = app;