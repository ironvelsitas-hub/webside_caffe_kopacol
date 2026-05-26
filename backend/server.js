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

// ============ DATABASE ============
let database = {
    products: [
        {
            id: 1,
            name: "Espresso",
            category: "kopi",
            price: 25000,
            image: null, // akan diisi base64
            imageUrl: "https://via.placeholder.com/300x200?text=Espresso",
            description: "Kopi hitam pekat dengan crema"
        },
        {
            id: 2,
            name: "Cappuccino",
            category: "kopi",
            price: 32000,
            image: null,
            imageUrl: "https://via.placeholder.com/300x200?text=Cappuccino",
            description: "Espresso dengan busa susu"
        },
        {
            id: 3,
            name: "French Fries",
            category: "snack",
            price: 18000,
            image: null,
            imageUrl: "https://via.placeholder.com/300x200?text=French+Fries",
            description: "Kentang goreng renyah"
        },
        {
            id: 4,
            name: "Nasi Goreng",
            category: "makanan",
            price: 35000,
            image: null,
            imageUrl: "https://via.placeholder.com/300x200?text=Nasi+Goreng",
            description: "Nasi goreng spesial dengan telur"
        }
    ],
    orders: [],
    tables: Array.from({ length: 10 }, (_, i) => ({ 
        id: i + 1, 
        number: i + 1,
        status: 'available',
        isActive: true,
        qrCode: null,
        qrCodeUrl: null,
        createdAt: new Date().toISOString()
    }))
};

// Helper functions
function readDB() {
    return database;
}

function writeDB(data) {
    database = data;
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
app.get('/api/products', (req, res) => {
    try {
        const db = readDB();
        // Kirimkan imageUrl untuk ditampilkan (bukan base64)
        const products = db.products.map(p => ({
            ...p,
            image: p.imageUrl || 'https://via.placeholder.com/300x200?text=Product'
        }));
        res.json(products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/:id', (req, res) => {
    const db = readDB();
    const product = db.products.find(p => p.id == req.params.id);
    if (product) {
        res.json({
            ...product,
            image: product.imageUrl || 'https://via.placeholder.com/300x200?text=Product'
        });
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.get('/api/products/category/:category', (req, res) => {
    const db = readDB();
    const products = db.products.filter(p => p.category === req.params.category);
    res.json(products);
});

// POST product (tambah produk baru) - dengan base64 image
app.post('/api/products', (req, res) => {
    try {
        const db = readDB();
        const { name, category, price, description, image } = req.body;
        
        // Validasi input
        if (!name) {
            return res.status(400).json({ error: 'Nama produk harus diisi!' });
        }
        
        if (!price || price <= 0) {
            return res.status(400).json({ error: 'Harga tidak valid!' });
        }
        
        const newProduct = {
            id: Date.now(),
            name: name,
            category: category || 'snack',
            price: parseInt(price),
            description: description || '',
            image: image || null, // simpan base64 jika ada
            imageUrl: image || 'https://via.placeholder.com/300x200?text=Product'
        };
        
        db.products.push(newProduct);
        writeDB(db);
        console.log('Product added:', newProduct.name);
        res.status(201).json({ 
            success: true, 
            product: {
                ...newProduct,
                image: newProduct.imageUrl
            }
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT (update) product
app.put('/api/products/:id', (req, res) => {
    const db = readDB();
    const productId = parseInt(req.params.id);
    const index = db.products.findIndex(p => p.id === productId);
    
    if (index !== -1) {
        const updatedProduct = {
            ...db.products[index],
            name: req.body.name || db.products[index].name,
            category: req.body.category || db.products[index].category,
            price: parseInt(req.body.price) || db.products[index].price,
            description: req.body.description || db.products[index].description,
            image: req.body.image || db.products[index].image,
            imageUrl: req.body.image || db.products[index].imageUrl
        };
        
        db.products[index] = updatedProduct;
        writeDB(db);
        res.json({ success: true, product: updatedProduct });
    } else {
        res.status(404).json({ error: 'Product not found', id: productId });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const db = readDB();
    const productId = parseInt(req.params.id);
    db.products = db.products.filter(p => p.id !== productId);
    writeDB(db);
    res.json({ message: 'Product deleted' });
});

// ============ ORDER ROUTES ============
app.post('/api/orders', (req, res) => {
    const db = readDB();
    const newOrder = {
        id: Date.now(),
        items: req.body.items || [],
        total: req.body.total || 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        customerName: req.body.customerName || null,
        customerPhone: req.body.customerPhone || null,
        customerAddress: req.body.customerAddress || null,
        tableNumber: req.body.tableNumber || null,
        note: req.body.note || null,
        paymentMethod: req.body.paymentMethod || null,
        paymentStatus: req.body.paymentStatus || 'pending'
    };
    db.orders.push(newOrder);
    writeDB(db);
    res.json(newOrder);
});

app.get('/api/orders', (req, res) => {
    const db = readDB();
    res.json(db.orders);
});

app.put('/api/orders/:id', (req, res) => {
    const db = readDB();
    const index = db.orders.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db.orders[index].status = req.body.status || db.orders[index].status;
        writeDB(db);
        res.json(db.orders[index]);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Confirm payment
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

// ============ TABLE MANAGEMENT ROUTES ============
app.get('/api/tables', (req, res) => {
    const db = readDB();
    res.json(db.tables);
});

app.get('/api/tables/:id', (req, res) => {
    const db = readDB();
    const table = db.tables.find(t => t.id == req.params.id);
    if (table) {
        res.json(table);
    } else {
        res.status(404).json({ error: 'Table not found' });
    }
});

app.post('/api/admin/tables', adminAuth, (req, res) => {
    const db = readDB();
    const { number, status } = req.body;
    
    if (!number) {
        return res.status(400).json({ error: 'Nomor meja harus diisi!' });
    }
    
    if (db.tables.some(t => t.number == number)) {
        return res.status(400).json({ error: 'Nomor meja sudah ada!' });
    }
    
    const newTable = {
        id: Date.now(),
        number: parseInt(number),
        status: status || 'available',
        isActive: true,
        createdAt: new Date().toISOString(),
        qrCode: null,
        qrCodeUrl: null
    };
    
    db.tables.push(newTable);
    writeDB(db);
    res.status(201).json({ success: true, table: newTable });
});

app.put('/api/admin/tables/:id', adminAuth, (req, res) => {
    const db = readDB();
    const index = db.tables.findIndex(t => t.id == req.params.id);
    
    if (index !== -1) {
        if (req.body.status) db.tables[index].status = req.body.status;
        if (req.body.isActive !== undefined) db.tables[index].isActive = req.body.isActive;
        writeDB(db);
        res.json({ success: true, table: db.tables[index] });
    } else {
        res.status(404).json({ error: 'Table not found' });
    }
});

app.put('/api/admin/tables/:id/qr', adminAuth, (req, res) => {
    const db = readDB();
    const index = db.tables.findIndex(t => t.id == req.params.id);
    
    if (index !== -1) {
        if (req.body.qrCode) db.tables[index].qrCode = req.body.qrCode;
        if (req.body.qrCodeUrl) db.tables[index].qrCodeUrl = req.body.qrCodeUrl;
        db.tables[index].updatedAt = new Date().toISOString();
        writeDB(db);
        res.json({ success: true, table: db.tables[index] });
    } else {
        res.status(404).json({ error: 'Table not found' });
    }
});

app.delete('/api/admin/tables/:id', adminAuth, (req, res) => {
    const db = readDB();
    const index = db.tables.findIndex(t => t.id == req.params.id);
    
    if (index !== -1) {
        db.tables.splice(index, 1);
        writeDB(db);
        res.json({ success: true, message: 'Table deleted' });
    } else {
        res.status(404).json({ error: 'Table not found' });
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
if (!isProduction) {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`🚀 Cafe IronColol Server Running!`);
        console.log(`========================================`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`📡 API: http://localhost:${PORT}/api/products`);
        console.log(`========================================\n`);
    });
}

module.exports = app;