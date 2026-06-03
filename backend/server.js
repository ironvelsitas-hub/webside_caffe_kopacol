const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { readStorage, writeStorage, nextId } = require('./dataStore');

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
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) return cb(null, true);
  cb(new Error('Hanya gambar yang diperbolehkan!'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ MULTER/ERROR HANDLING (to debug 500) ============
function safeErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || 'Unknown error';
}

// Multer / upload error handler
app.use((err, req, res, next) => {
  // multer will throw these errors into next(err)
  if (err) {
    const status = err.statusCode || err.status || 500;
    const payload = {
      error: safeErrorMessage(err),
      code: err.code || undefined,
      field: err.field || undefined,
      name: err.name || undefined
    };

    // Log request context for debugging
    console.error('Upload/Server error:', {
      method: req.method,
      path: req.path,
      contentType: req.headers['content-type'],
      bodyKeys: req.body ? Object.keys(req.body) : [],
      fileField: err.field
    });

    return res.status(status).json(payload);
  }
  next();
});

function getApiUrl(req) {

  return `${req.protocol}://${req.get('host')}`;
}

// ============ ADMIN AUTH ============
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Admin login attempt:', { username, password });

  if (username === 'admin' && password === 'admin123') {
    return res.json({
      success: true,
      token: 'admin_token_' + Date.now(),
      message: 'Login successful'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Username atau password salah!'
  });
});

// ============ PRODUCT ROUTES ============
app.get('/api/products', async (req, res) => {
  try {
    const data = readStorage();
    const products = [...(data.products || [])].sort((a, b) => (b.id || 0) - (a.id || 0));
    res.json(products);
  } catch (e) {
    console.error('Error fetching products:', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const product = (data.products || []).find(p => p.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: 'Invalid ID' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Nama produk harus diisi!' });
    if (!price || Number(price) <= 0) return res.status(400).json({ error: 'Harga tidak valid!' });

    const data = readStorage();
    const newProduct = {
      id: nextId(data.products || []),
      name,
      category: category || 'snack',
      price: Number(price),
      description: description || '',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      created_at: new Date().toISOString()
    };

    data.products.push(newProduct);
    writeStorage(data);

    return res.status(201).json({ success: true, product: newProduct });
  } catch (e) {
    console.error('Error adding product:', e);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, price, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Nama produk harus diisi!' });

    const data = readStorage();
    const idx = (data.products || []).findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const updated = {
      ...data.products[idx],
      name,
      category: category || 'snack',
      price: Number(price),
      description: description || '',
      image: imageUrl !== null ? imageUrl : data.products[idx].image
    };

    data.products[idx] = updated;
    writeStorage(data);

    return res.json({ success: true, product: updated });
  } catch (e) {
    console.error('Error updating product:', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const before = (data.products || []).length;
    data.products = (data.products || []).filter(p => p.id !== id);

    if ((data.products || []).length === before) return res.status(404).json({ error: 'Product not found' });

    writeStorage(data);
    return res.json({ message: 'Product deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ============ ORDER ROUTES ============
app.post('/api/orders', async (req, res) => {
  try {
    const { items, total, customerName, customerPhone, customerAddress, tableNumber, note, paymentMethod, paymentStatus, type } = req.body;

    const data = readStorage();
    const order = {
      id: nextId(data.orders || []),
      items: Array.isArray(items) ? items : [],
      total: Number(total) || 0,
      status: 'pending',
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      table_number: tableNumber || null,
      note: note || null,
      payment_method: paymentMethod || null,
      payment_status: paymentStatus || 'pending',
      type: type || 'dine_in',
      created_at: new Date().toISOString()
    };

    data.orders.push(order);
    writeStorage(data);

    return res.json({ success: true, id: order.id });
  } catch (e) {
    console.error('Error creating order:', e);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const data = readStorage();
    const orders = [...(data.orders || [])].sort((a, b) => (b.id || 0) - (a.id || 0));
    res.json(orders);
  } catch (e) {
    console.error('Error fetching orders:', e);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const idx = (data.orders || []).findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });

    data.orders[idx].status = req.body.status;
    writeStorage(data);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.put('/api/orders/:id/confirm-payment', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const idx = (data.orders || []).findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });

    data.orders[idx].payment_status = 'paid';
    writeStorage(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ============ TABLE ROUTES ============
app.get('/api/tables', async (req, res) => {
  try {
    const data = readStorage();
    const tables = [...(data.tables || [])].sort((a, b) => (a.number || 0) - (b.number || 0));

    res.json(tables.map(t => ({
      id: t.id,
      number: t.number,
      status: t.status,
      isActive: t.is_active,
      qrCode: t.qr_code,
      qrCodeUrl: t.qr_code_url,
      createdAt: t.created_at
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

app.post('/api/admin/tables', async (req, res) => {
  try {
    const { number, status } = req.body;
    if (!number) return res.status(400).json({ error: 'Nomor meja harus diisi!' });

    const data = readStorage();
    const exists = (data.tables || []).some(t => String(t.number) === String(number));
    if (exists) return res.status(400).json({ error: 'Nomor meja sudah ada!' });

    const table = {
      id: nextId(data.tables || []),
      number: Number(number),
      status: status || 'available',
      is_active: true,
      qr_code: null,
      qr_code_url: null,
      created_at: new Date().toISOString()
    };

    data.tables.push(table);
    writeStorage(data);

    res.status(201).json({ success: true, id: table.id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add table' });
  }
});

app.put('/api/admin/tables/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const idx = (data.tables || []).findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Table not found' });

    data.tables[idx].status = req.body.status;
    writeStorage(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.put('/api/admin/tables/:id/qr', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const idx = (data.tables || []).findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Table not found' });

    data.tables[idx].qr_code = req.body.qrCode;
    data.tables[idx].qr_code_url = req.body.qrCodeUrl;
    writeStorage(data);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/admin/tables/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readStorage();
    const before = (data.tables || []).length;
    data.tables = (data.tables || []).filter(t => t.id !== id);

    if ((data.tables || []).length === before) return res.status(404).json({ error: 'Table not found' });

    writeStorage(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
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

app.get('/api/user/orders/:phone', async (req, res) => {
  try {
    const data = readStorage();
    const orders = (data.orders || [])
      .filter(o => String(o.customer_phone || '') === String(req.params.phone))
      .sort((a, b) => (b.id || 0) - (a.id || 0));
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Vercel: do not rely on app.listen.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on :${PORT}`);
  });
}

// ============ ADMIN RESET (clear products/orders/tables) ============
// NOTE: guarded with a simple secret to avoid accidental public resets.
app.post('/api/admin/reset', (req, res) => {
  try {
    const { secret } = req.body || {};
    const ADMIN_RESET_SECRET = process.env.ADMIN_RESET_SECRET || 'reset_admin_123';

    if (secret !== ADMIN_RESET_SECRET) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const data = readStorage();
    data.products = [];
    data.orders = [];
    data.tables = [];
    writeStorage(data);

    return res.json({ success: true, message: 'Admin data reset complete' });
  } catch (e) {
    console.error('Admin reset error:', e);
    return res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

module.exports = app;


