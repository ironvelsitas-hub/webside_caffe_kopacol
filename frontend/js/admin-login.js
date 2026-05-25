// Simple Admin Login - No complex auth
const API_URL = window.location.origin;

// Data login hardcoded untuk testing
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Login function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('Login attempt:', username);
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Login success
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUsername', username);
        
        // Hide login, show admin panel
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminUsername').textContent = username;
        
        // Load data
        loadProducts();
        loadOrders();
        loadTables();
        loadQRManagement();
        
        showToast('Login berhasil!');
    } else {
        showToast('Username atau password salah!', true);
    }
}

// Logout
function logout() {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminUsername');
    
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    
    // Reset form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    showToast('Logout berhasil');
}

// Check login status
function checkLogin() {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const username = localStorage.getItem('adminUsername');
    
    if (isLoggedIn === 'true' && username) {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminUsername').textContent = username;
        
        loadProducts();
        loadOrders();
        loadTables();
        loadQRManagement();
    }
}

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        const tbody = document.getElementById('productsTableBody');
        
        if (tbody) {
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td><img src="${product.image}" alt="${product.name}" class="product-image-cell" onerror="this.src='https://via.placeholder.com/50'"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>Rp ${product.price.toLocaleString()}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Gagal memuat produk', true);
    }
}

// Load orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/api/orders`);
        const orders = await response.json();
        const ordersList = document.getElementById('ordersList');
        
        if (ordersList) {
            if (orders.length === 0) {
                ordersList.innerHTML = '<div class="text-center">Belum ada pesanan</div>';
                return;
            }
            
            ordersList.innerHTML = orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">#${order.id}</span>
                        <span class="order-status status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-details">
                        <p><strong>${order.customerName || 'Meja ' + (order.tableNumber || 'Customer')}</strong></p>
                        ${order.customerAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${order.customerAddress}</p>` : ''}
                        <div class="order-items">
                            ${order.items?.map(item => `
                                <div class="order-item">
                                    <span>${item.name} x${item.quantity}</span>
                                    <span>Rp ${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            `).join('') || 'Tidak ada item'}
                        </div>
                        <div class="order-total">
                            Total: Rp ${order.total?.toLocaleString() || 0}
                        </div>
                    </div>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" class="order-status-select">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Update order status
window.updateOrderStatus = async (id, status) => {
    try {
        await fetch(`${API_URL}/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast('Status pesanan berhasil diupdate');
        loadOrders();
    } catch (error) {
        showToast('Gagal update status!', true);
    }
};

// Load tables
async function loadTables() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const tablesGrid = document.getElementById('tablesGrid');
        
        if (tablesGrid) {
            tablesGrid.innerHTML = tables.map(table => `
                <div class="table-card">
                    <i class="fas fa-chair"></i>
                    <h3>Meja ${table.number || table.id}</h3>
                    <div class="table-status ${table.status === 'available' ? 'status-available' : 'status-occupied'}">
                        ${table.status === 'available' ? 'Tersedia' : 'Terisi'}
                    </div>
                    ${table.qrCode ? '<small><i class="fas fa-check-circle"></i> QR Ready</small>' : '<small><i class="fas fa-times-circle"></i> QR Not Ready</small>'}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

// Load QR Management
async function loadQRManagement() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const grid = document.getElementById('qrManagementGrid');
        
        if (grid) {
            grid.innerHTML = tables.map(table => `
                <div class="qr-admin-card">
                    <div class="qr-admin-header">
                        <h3><i class="fas fa-chair"></i> Meja ${table.number || table.id}</h3>
                        <span class="status-badge ${table.status === 'available' ? 'status-available' : 'status-occupied'}">
                            ${table.status === 'available' ? 'Tersedia' : 'Terisi'}
                        </span>
                    </div>
                    <div class="qr-admin-body">
                        ${table.qrCodeUrl ? `
                            <div class="qr-preview">
                                <img src="${table.qrCodeUrl}" alt="QR Meja ${table.number || table.id}">
                                <p class="qr-text">${table.qrCode || `${API_URL}/menu.html?table=${table.number || table.id}`}</p>
                            </div>
                            <div class="qr-actions">
                                <button class="btn-download-qr" onclick="downloadQR('${table.qrCodeUrl}', ${table.number || table.id})">
                                    <i class="fas fa-download"></i> Download
                                </button>
                                <button class="btn-print-qr" onclick="printQR(${table.number || table.id})">
                                    <i class="fas fa-print"></i> Print
                                </button>
                            </div>
                        ` : `
                            <div class="qr-placeholder">
                                <i class="fas fa-qrcode"></i>
                                <p>QR Code belum dibuat</p>
                                <button class="btn-generate-qr" onclick="generateQR(${table.id})">
                                    <i class="fas fa-plus-circle"></i> Generate QR Code
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading QR management:', error);
    }
}

// Generate QR for table
window.generateQR = async (tableId) => {
    try {
        // Simulasi generate QR
        const tableNumber = tableId;
        const qrData = `${API_URL}/menu.html?table=${tableNumber}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
        
        showToast('QR Code berhasil dibuat!');
        loadQRManagement();
    } catch (error) {
        showToast('Gagal membuat QR Code!', true);
    }
};

// Download QR
window.downloadQR = (qrUrl, tableNumber) => {
    const link = document.createElement('a');
    link.download = `qrcode-meja-${tableNumber}.png`;
    link.href = qrUrl;
    link.click();
};

// Print QR
window.printQR = (tableNumber) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${API_URL}/menu.html?table=${tableNumber}`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>QR Code Meja ${tableNumber} - Cafe IronColol</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: white;
                }
                .qr-container {
                    text-align: center;
                    padding: 20px;
                }
                .qr-container h1 { color: #667eea; margin-bottom: 20px; }
                .qr-container img {
                    width: 250px;
                    height: 250px;
                    border: 2px solid #667eea;
                    border-radius: 10px;
                    padding: 10px;
                }
                .qr-container p { margin-top: 20px; font-size: 14px; color: #666; }
                @media print {
                    body { margin: 0; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <h1>🏠 Cafe IronColol</h1>
                <h2>Meja ${tableNumber}</h2>
                <img src="${qrUrl}">
                <p>Scan QR Code ini untuk memesan dari meja ${tableNumber}</p>
                <p><small>${API_URL}/menu.html?table=${tableNumber}</small></p>
            </div>
            <script>
                window.print();
                setTimeout(() => window.close(), 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// Edit product
window.editProduct = async (id) => {
    try {
        const response = await fetch(`${API_URL}/api/products/${id}`);
        const product = await response.json();
        
        document.getElementById('modalTitle').textContent = 'Edit Produk';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description;
        
        if (product.image) {
            const preview = document.getElementById('imagePreview');
            preview.src = product.image;
            preview.style.display = 'block';
        }
        
        document.getElementById('productModal').style.display = 'block';
    } catch (error) {
        showToast('Error loading product', true);
    }
};

// Delete product
window.deleteProduct = async (id) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        try {
            await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
            loadProducts();
            showToast('Produk berhasil dihapus');
        } catch (error) {
            showToast('Gagal hapus produk!', true);
        }
    }
};

// Product form submit
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('description', document.getElementById('productDescription').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const id = document.getElementById('productId').value;
    const url = id ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, { method: method, body: formData });
        if (response.ok) {
            closeProductModal();
            loadProducts();
            showToast(id ? 'Produk diupdate' : 'Produk ditambahkan');
        }
    } catch (error) {
        showToast('Gagal menyimpan!', true);
    }
});

// Tab navigation
const navBtns = document.querySelectorAll('.admin-nav-btn');
const tabs = document.querySelectorAll('.admin-tab');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tabId}Tab`).classList.add('active');
        
        if (tabId === 'products') loadProducts();
        else if (tabId === 'orders') loadOrders();
        else if (tabId === 'tables') loadTables();
        else if (tabId === 'qrcode') loadQRManagement();
    });
});

// Modal functions
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Image preview
document.getElementById('productImage')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Login form
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login();
});

// Add product button
document.getElementById('addProductBtn')?.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Tambah Produk';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('productModal').style.display = 'block';
});

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// Generate all QR
document.getElementById('generateAllQRBtn')?.addEventListener('click', () => {
    showToast('Generate QR untuk semua meja');
    loadQRManagement();
});

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.background = isError ? '#ef4444' : '#1a1a2e';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    } else {
        alert(message);
    }
}

// Initialize
checkLogin();