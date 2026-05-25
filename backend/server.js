const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ CORS CONFIGURATION FOR HOSTING ============
// CORS configuration untuk hosting
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Tambahkan juga untuk menangani preflight requests
app.options('*', cors());

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Setup multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Database file
const DB_PATH = './database/db.json';

// Initialize database
function initDB() {
  if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database');
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
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
        }
      ],
      orders: [],
      tables: Array.from({ length: 10 }, (_, i) => ({ 
        id: i + 1, 
        number: i + 1,
        status: 'available',
        qrCode: null,
        qrCodeUrl: null,
        isActive: true,
        createdAt: new Date().toISOString()
      })),
      admin: {
        username: "admin",
        password: "admin123"
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  const data = fs.readFileSync(DB_PATH);
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

initDB();

// ============ AUTH MIDDLEWARE ============
// Hanya SATU definisi adminAuth
function adminAuth(req, res, next) {
  const token = req.headers['authorization'];
  const db = readDB();
  
  // Untuk development, izinkan akses tanpa token dulu
  // Tapi tetap validasi jika ada token
  if (!token) {
    return next();
  }
  
  // Validasi token jika ada (opsional)
  const expectedToken = `${db.admin.username}_${db.admin.password}`;
  if (token.includes(expectedToken)) {
    return next();
  }
  
  // Jika token tidak valid
  return res.status(401).json({ error: 'Unauthorized access' });
}

// ============ ADMIN AUTH ROUTES ============
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  
  console.log('Login attempt:', username);
  console.log('Stored admin:', db.admin.username);
  
  if (username === db.admin.username && password === db.admin.password) {
    const token = `${db.admin.username}_${db.admin.password}_${Date.now()}`;
    res.json({ 
      success: true, 
      token: token,
      message: 'Login successful' 
    });
  } else {
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials. Username atau password salah!' 
    });
  }
});

// ============ TABLE MANAGEMENT ============

// Get all tables (admin only)
app.get('/api/admin/tables', adminAuth, (req, res) => {
  const db = readDB();
  res.json(db.tables);
});

// Get single table (admin only)
app.get('/api/admin/tables/:id', adminAuth, (req, res) => {
  const db = readDB();
  const table = db.tables.find(t => t.id == req.params.id);
  if (table) {
    res.json(table);
  } else {
    res.status(404).json({ error: 'Table not found' });
  }
});

// Generate QR code for a table (admin only)
app.post('/api/admin/tables/:id/generate-qr', adminAuth, (req, res) => {
  const db = readDB();
  const tableIndex = db.tables.findIndex(t => t.id == req.params.id);
  
  if (tableIndex !== -1) {
    const baseUrl = req.headers.origin || `http://localhost:${PORT}`;
    const qrData = `${baseUrl}/menu.html?table=${db.tables[tableIndex].number}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    db.tables[tableIndex].qrCode = qrData;
    db.tables[tableIndex].qrCodeUrl = qrCodeUrl;
    db.tables[tableIndex].updatedAt = new Date().toISOString();
    
    writeDB(db);
    res.json({ 
      success: true, 
      table: db.tables[tableIndex],
      qrCodeUrl: qrCodeUrl
    });
  } else {
    res.status(404).json({ error: 'Table not found' });
  }
});

// Generate QR for all tables (admin only)
app.post('/api/admin/tables/generate-all-qr', adminAuth, (req, res) => {
  const db = readDB();
  const baseUrl = req.headers.origin || `http://localhost:${PORT}`;
  
  db.tables.forEach(table => {
    const qrData = `${baseUrl}/menu.html?table=${table.number}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    table.qrCode = qrData;
    table.qrCodeUrl = qrCodeUrl;
    table.updatedAt = new Date().toISOString();
  });
  
  writeDB(db);
  res.json({ 
    success: true, 
    message: 'QR codes generated for all tables',
    tables: db.tables 
  });
});

// Update table status (admin only)
app.put('/api/admin/tables/:id', adminAuth, (req, res) => {
  const db = readDB();
  const tableIndex = db.tables.findIndex(t => t.id == req.params.id);
  
  if (tableIndex !== -1) {
    if (req.body.status) {
      db.tables[tableIndex].status = req.body.status;
    }
    if (req.body.isActive !== undefined) {
      db.tables[tableIndex].isActive = req.body.isActive;
    }
    writeDB(db);
    res.json({ success: true, table: db.tables[tableIndex] });
  } else {
    res.status(404).json({ error: 'Table not found' });
  }
});

// Delete/Deactivate table (admin only)
app.delete('/api/admin/tables/:id', adminAuth, (req, res) => {
  const db = readDB();
  const tableIndex = db.tables.findIndex(t => t.id == req.params.id);
  
  if (tableIndex !== -1) {
    db.tables[tableIndex].isActive = false;
    db.tables[tableIndex].qrCode = null;
    db.tables[tableIndex].qrCodeUrl = null;
    writeDB(db);
    res.json({ success: true, message: 'Table deactivated' });
  } else {
    res.status(404).json({ error: 'Table not found' });
  }
});

// ============ PUBLIC TABLE ROUTES ============
app.get('/api/tables', (req, res) => {
  const db = readDB();
  const activeTables = db.tables.filter(t => t.isActive === true);
  res.json(activeTables);
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.get('/api/products/category/:category', (req, res) => {
  const db = readDB();
  const products = db.products.filter(p => p.category === req.params.category);
  res.json(products);
});

app.post('/api/products', adminAuth, upload.single('image'), (req, res) => {
  const db = readDB();
  const newProduct = {
    id: Date.now(),
    name: req.body.name,
    category: req.body.category,
    price: parseInt(req.body.price),
    description: req.body.description || '',
    image: req.file ? `/uploads/${req.file.filename}` : req.body.image
  };
  db.products.push(newProduct);
  writeDB(db);
  res.json(newProduct);
});

app.put('/api/products/:id', adminAuth, upload.single('image'), (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id == req.params.id);
  if (index !== -1) {
    const updatedProduct = {
      ...db.products[index],
      name: req.body.name || db.products[index].name,
      category: req.body.category || db.products[index].category,
      price: parseInt(req.body.price) || db.products[index].price,
      description: req.body.description || db.products[index].description,
      image: req.file ? `/uploads/${req.file.filename}` : (req.body.image || db.products[index].image)
    };
    db.products[index] = updatedProduct;
    writeDB(db);
    res.json(updatedProduct);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
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

app.get('/api/orders', adminAuth, (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.put('/api/orders/:id', adminAuth, (req, res) => {
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

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle all other routes for frontend SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
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
  console.log(`🔐 Admin Login: http://localhost:${PORT}/admin.html`);
  console.log(`👤 Username: admin`);
  console.log(`🔑 Password: admin123`);
  console.log(`========================================\n`);
});