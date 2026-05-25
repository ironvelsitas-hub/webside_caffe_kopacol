// Simple Admin Script - No Complex Auth
const API_URL = window.location.origin;

// Hardcoded credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Check login on page load
function checkLogin() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadProducts();
        loadOrders();
        loadTables();
        loadQRManagement();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    }
}

// Login function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminUsername', username);
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminUsername').textContent = username;
        showToast('Login berhasil!');
        loadProducts();
        loadOrders();
        loadTables();
        loadQRManagement();
    } else {
        showToast('Username atau password salah!', true);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    showToast('Logout berhasil');
}

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        const tbody = document.getElementById('productsTableBody');
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada produk</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td><img src="${product.image}" class="product-image-cell" onerror="this.src='https://via.placeholder.com/50'"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>Rp ${Number(product.price).toLocaleString()}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productsTableBody').innerHTML = '<tr><td colspan="5" class="text-center">Gagal memuat produk</td></tr>';
    }
}

// Edit product
window.editProduct = async (id) => {
    try {
        const response = await fetch(`${API_URL}/api/products/${id}`);
        const product = await response.json();
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Produk';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productImage').value = product.image;
        
        document.getElementById('productModal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading product', true);
    }
};

// Delete product
window.deleteProduct = async (id) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        try {
            const response = await fetch(`${API_URL}/api/products/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('Produk berhasil dihapus');
                loadProducts();
            } else {
                showToast('Gagal menghapus produk', true);
            }
        } catch (error) {
            showToast('Error: ' + error.message, true);
        }
    }
};

// Save product (add/edit)
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseInt(document.getElementById('productPrice').value),
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value || 'https://via.placeholder.com/300x200?text=Product'
    };
    
    const url = id ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            showToast(id ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan');
            document.getElementById('productModal').style.display = 'none';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            loadProducts();
        } else {
            showToast('Gagal menyimpan produk', true);
        }
    } catch (error) {
        showToast('Error: ' + error.message, true);
    }
});

// Load orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/api/orders`);
        const orders = await response.json();
        const ordersList = document.getElementById('ordersList');
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="text-center">Belum ada pesanan</div>';
            return;
        }
        
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <strong>#${order.id}</strong>
                    <span class="order-status status-${order.status}">${order.status}</span>
                </div>
                <div><strong>${order.customerName || 'Meja ' + (order.tableNumber || 'Customer')}</strong></div>
                ${order.customerAddress ? `<div><small>📍 ${order.customerAddress}</small></div>` : ''}
                <div class="order-items" style="margin: 0.5rem 0;">
                    ${order.items?.map(item => `<div>${item.name} x${item.quantity} = Rp ${(item.price * item.quantity).toLocaleString()}</div>`).join('') || 'Tidak ada item'}
                </div>
                <div><strong>Total: Rp ${(order.total || 0).toLocaleString()}</strong></div>
                <select onchange="updateOrderStatus(${order.id}, this.value)" style="margin-top: 0.5rem; padding: 0.3rem; border-radius: 5px;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('ordersList').innerHTML = '<div class="text-center">Gagal memuat pesanan</div>';
    }
}

// Update order status
window.updateOrderStatus = async (id, status) => {
    try {
        const response = await fetch(`${API_URL}/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            showToast('Status pesanan diupdate');
            loadOrders();
        }
    } catch (error) {
        showToast('Error update status', true);
    }
};

// Load tables
async function loadTables() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const tablesGrid = document.getElementById('tablesGrid');
        
        tablesGrid.innerHTML = tables.map(table => `
            <div class="table-card">
                <i class="fas fa-chair"></i>
                <h3>Meja ${table.number || table.id}</h3>
                <div class="${table.status === 'available' ? 'status-available' : 'status-occupied'}">
                    ${table.status === 'available' ? '✅ Tersedia' : '🔴 Terisi'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tablesGrid').innerHTML = '<div class="text-center">Gagal memuat meja</div>';
    }
}

// Load QR Management
async function loadQRManagement() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const grid = document.getElementById('qrManagementGrid');
        
        grid.innerHTML = tables.map(table => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${API_URL}/menu.html?table=${table.number || table.id}`;
            return `
                <div class="qr-admin-card">
                    <h3><i class="fas fa-chair"></i> Meja ${table.number || table.id}</h3>
                    <div class="qr-preview">
                        <img src="${qrUrl}" alt="QR Meja ${table.number || table.id}">
                        <p><small>${API_URL}/menu.html?table=${table.number || table.id}</small></p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="action-btn edit-btn" onclick="downloadQR('${qrUrl}', ${table.number || table.id})">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="action-btn edit-btn" onclick="printQR(${table.number || table.id})">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('qrManagementGrid').innerHTML = '<div class="text-center">Gagal memuat QR</div>';
    }
}

// Download QR
window.downloadQR = (qrUrl, tableNumber) => {
    const link = document.createElement('a');
    link.download = `qrcode-meja-${tableNumber}.png`;
    link.href = qrUrl;
    link.click();
    showToast(`Download QR Meja ${tableNumber}`);
};

// Print QR
window.printQR = (tableNumber) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${API_URL}/menu.html?table=${tableNumber}`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>QR Code Meja ${tableNumber}</title></head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
            <div style="text-align: center;">
                <h1>Cafe IronColol</h1>
                <h2>Meja ${tableNumber}</h2>
                <img src="${qrUrl}" style="width: 250px; height: 250px;">
                <p>Scan QR code untuk memesan</p>
                <small>${API_URL}/menu.html?table=${tableNumber}</small>
            </div>
            <script>window.print(); setTimeout(() => window.close(), 500);<\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// Generate all QR
document.getElementById('generateAllQRBtn')?.addEventListener('click', () => {
    showToast('Generate QR untuk semua meja');
    loadQRManagement();
});

// Tab navigation
const navBtns = document.querySelectorAll('.admin-nav-btn');
const tabs = ['products', 'orders', 'tables', 'qrcode'];

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabs.forEach(tab => {
            const el = document.getElementById(`${tab}Tab`);
            if (el) el.style.display = 'none';
        });
        const activeTab = document.getElementById(`${tabId}Tab`);
        if (activeTab) activeTab.style.display = 'block';
        
        // Refresh data
        if (tabId === 'products') loadProducts();
        else if (tabId === 'orders') loadOrders();
        else if (tabId === 'tables') loadTables();
        else if (tabId === 'qrcode') loadQRManagement();
    });
});

// Modal close
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => {
        document.getElementById('productModal').style.display = 'none';
    };
});

// Add product button
document.getElementById('addProductBtn')?.addEventListener('click', () => {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Tambah Produk';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModal').style.display = 'flex';
});

// Login form
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login();
});

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// Show toast
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#ef4444' : '#1a1a2e';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize
checkLogin();