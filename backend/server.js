const express = require('express');
const cors = require('cors');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database file - Gunakan memory storage untuk Vercel
let database = {
    products: [
        {
            id: 1,
            name: "Espresso",
            category: "kopi",
            price: 25000,
            image: "https://via.placeholder.com/300x200?text=Espresso",
            description: "Kopi hitam pekat dengan crema"
        },
        {
            id: 2,
            name: "Cappuccino",
            category: "kopi",
            price: 32000,
            image: "https://via.placeholder.com/300x200?text=Cappuccino",
            description: "Espresso dengan busa susu"
        },
        {
            id: 3,
            name: "French Fries",
            category: "snack",
            price: 18000,
            image: "https://via.placeholder.com/300x200?text=French+Fries",
            description: "Kentang goreng renyah"
        },
        {
            id: 4,
            name: "Nasi Goreng",
            category: "makanan",
            price: 35000,
            image: "https://via.placeholder.com/300x200?text=Nasi+Goreng",
            description: "Nasi goreng spesial dengan telur"
        },
        {
            id: 5,
            name: "Latte",
            category: "kopi",
            price: 35000,
            image: "https://via.placeholder.com/300x200?text=Latte",
            description: "Espresso dengan susu steamed"
        },
        {
            id: 6,
            name: "Mocha",
            category: "kopi",
            price: 38000,
            image: "https://via.placeholder.com/300x200?text=Mocha",
            description: "Espresso dengan coklat dan susu"
        },
        {
            id: 7,
            name: "American Fried Chicken",
            category: "makanan",
            price: 28000,
            image: "https://via.placeholder.com/300x200?text=American+Fried+Chicken",
            description: "Ayam goreng crispy"
        },
        {
            id: 8,
            name: "Onion Rings",
            category: "snack",
            price: 15000,
            image: "https://via.placeholder.com/300x200?text=Onion+Rings",
            description: "Bawang bombay goreng crispy"
        }
    ],
    orders: [],
    tables: Array.from({ length: 10 }, (_, i) => ({ 
        id: i + 1, 
        number: i + 1,
        status: 'available',
        isActive: true
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
        console.log('Sending products:', db.products.length);
        res.json(db.products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/category/:category', (req, res) => {
    const db = readDB();
    const products = db.products.filter(p => p.category === req.params.category);
    res.json(products);
});

app.post('/api/products', (req, res) => {
    const db = readDB();
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        category: req.body.category,
        price: parseInt(req.body.price),
        description: req.body.description || '',
        image: req.body.image || 'https://via.placeholder.com/300x200?text=Product'
    };
    db.products.push(newProduct);
    writeDB(db);
    res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const db = readDB();
    const index = db.products.findIndex(p => p.id == req.params.id);
    if (index !== -1) {
        db.products[index] = {
            ...db.products[index],
            name: req.body.name || db.products[index].name,
            category: req.body.category || db.products[index].category,
            price: parseInt(req.body.price) || db.products[index].price,
            description: req.body.description || db.products[index].description,
            image: req.body.image || db.products[index].image
        };
        writeDB(db);
        res.json(db.products[index]);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const db = readDB();
    db.products = db.products.filter(p => p.id != req.params.id);
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
        note: req.body.note || null
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

// ============ TABLE ROUTES ============
app.get('/api/tables', (req, res) => {
    const db = readDB();
    res.json(db.tables);
});

// ============ SERVE FRONTEND ============
// Untuk production di Vercel, frontend sudah di serve secara terpisah
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '../frontend')));
    
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
}

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Cafe IronColol Server Running!`);
    console.log(`========================================`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/products`);
    console.log(`========================================\n`);
});

// Export for Vercel
module.exports = app;