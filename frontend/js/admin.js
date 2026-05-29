// API Configuration
const API_URL = window.location.origin || 'http://localhost:3000';
let adminToken = null;

// Login function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminUsername', username);
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('adminUsername').textContent = username;
            showToast('Login berhasil!');
            
            await loadProducts();
            await loadOrders();
            await loadTables();
            await loadQRManagement();
        } else {
            showToast(data.error || 'Login gagal!', true);
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error: ' + error.message, true);
    }
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    adminToken = null;
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    showToast('Logout berhasil');
}

// ============ PRODUCT MANAGEMENT ============

// Load products
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Memuat produk...<\/td><\/tr>';
    
    try {
        const response = await fetch(`${API_URL}/api/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada produk. Klik "Tambah Produk" untuk menambahkan.<\/td><\/tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td><img src="${product.image || 'https://via.placeholder.com/50'}" class="product-image-cell" onerror="this.src='https://via.placeholder.com/50'"><\/td>
                <td><strong>${escapeHtml(product.name)}</strong><\/td>
                <td>${escapeHtml(product.category)}<\/td>
                <td>Rp ${(product.price || 0).toLocaleString()}<\/td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i> Hapus</button>
                <\/td>
            <\/tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading products:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: red;">
            <i class="fas fa-exclamation-triangle"></i> Gagal memuat produk: ${error.message}
        <\/td><\/tr>`;
    }
}

// Edit product
window.editProduct = async (id) => {
    try {
        const response = await fetch(`${API_URL}/api/products/${id}`);
        const product = await response.json();
        
        if (!product) {
            showToast('Produk tidak ditemukan!', true);
            return;
        }
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Produk';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description || '';
        
        // Reset file input
        const imageInput = document.getElementById('productImage');
        if (imageInput) imageInput.value = '';
        
        // Tampilkan preview gambar lama jika ada
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreview');
        
        if (product.image && product.image !== 'https://via.placeholder.com/50') {
            previewImg.src = product.image;
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
        
        document.getElementById('productModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Gagal memuat data produk: ' + error.message, true);
    }
};

// Delete product
window.deleteProduct = async (id) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        try {
            const response = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Produk berhasil dihapus');
                await loadProducts();
            } else {
                const error = await response.json();
                showToast(error.error || 'Gagal menghapus produk', true);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Error: ' + error.message, true);
        }
    }
};

// Close product modal
function closeProductModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const productId = document.getElementById('productId');
    const productImage = document.getElementById('productImage');
    
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    if (previewContainer) previewContainer.style.display = 'none';
    if (productId) productId.value = '';
    if (productImage) productImage.value = '';
}

// Add product button
const addProductBtn = document.getElementById('addProductBtn');
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        console.log('Add product button clicked');
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Tambah Produk';
        
        // Reset form
        const form = document.getElementById('productForm');
        const productId = document.getElementById('productId');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const productImage = document.getElementById('productImage');
        const nameInput = document.getElementById('productName');
        const categorySelect = document.getElementById('productCategory');
        const priceInput = document.getElementById('productPrice');
        const descriptionTextarea = document.getElementById('productDescription');
        
        if (form) form.reset();
        if (productId) productId.value = '';
        if (previewContainer) previewContainer.style.display = 'none';
        if (productImage) productImage.value = '';
        if (nameInput) nameInput.value = '';
        if (categorySelect) categorySelect.value = 'kopi';
        if (priceInput) priceInput.value = '';
        if (descriptionTextarea) descriptionTextarea.value = '';
        
        document.getElementById('productModal').style.display = 'flex';
    });
}

// Preview image before upload
const productImageInput = document.getElementById('productImage');
if (productImageInput) {
    productImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validasi tipe file
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast('File harus berupa gambar (JPG, PNG, GIF, WEBP)!', true);
                productImageInput.value = '';
                return;
            }
            
            // Validasi ukuran file (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Ukuran gambar maksimal 5MB!', true);
                productImageInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewContainer = document.getElementById('imagePreviewContainer');
                const previewImg = document.getElementById('imagePreview');
                if (previewContainer && previewImg) {
                    previewImg.src = e.target.result;
                    previewContainer.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// ============ SAVE PRODUCT - UPDATED WITH FORM DATA ============
// Save product (add/edit) - dengan upload file
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Form submitted');
        
        // Ambil nilai dari form
        const id = document.getElementById('productId').value;
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = document.getElementById('productPrice').value;
        const description = document.getElementById('productDescription').value;
        const imageFile = document.getElementById('productImage').files[0];
        
        console.log('Form data:', { id, name, category, price, description, hasImage: !!imageFile });
        
        // Validasi input
        if (!name) {
            showToast('Nama produk harus diisi!', true);
            return;
        }
        
        if (!price || price <= 0) {
            showToast('Harga harus diisi dengan benar!', true);
            return;
        }
        
        // Buat FormData
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('description', description);
        
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const url = id ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;
        const method = id ? 'PUT' : 'POST';
        
        console.log('Sending request to:', url, 'method:', method);
        
        try {
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            const result = await response.json();
            console.log('Response:', result);
            
            if (response.ok) {
                showToast(id ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan');
                closeProductModal();
                await loadProducts();
            } else {
                showToast(result.error || 'Gagal menyimpan produk', true);
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error: ' + error.message, true);
        }
    });
}

// Submit button click handler
const submitBtn = document.getElementById('submitProductBtn');
if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Submit button clicked');
        const form = document.getElementById('productForm');
        if (form) {
            // Trigger form submit
            const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
            form.dispatchEvent(submitEvent);
        }
    });
}

// Remove image preview function (global)
window.removeImagePreview = function() {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const imageInput = document.getElementById('productImage');
    if (previewContainer) previewContainer.style.display = 'none';
    if (imageInput) imageInput.value = '';
};

// ============ TABLE MANAGEMENT ============

// Load tables
async function loadTables() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const tablesGrid = document.getElementById('tablesGrid');
        
        if (!tablesGrid) return;
        
        if (!tables || tables.length === 0) {
            tablesGrid.innerHTML = '<div class="text-center">Belum ada meja. Klik "Tambah Meja" untuk menambahkan.</div>';
            return;
        }
        
        tablesGrid.innerHTML = tables.map(table => `
            <div class="table-card">
                <i class="fas fa-chair"></i>
                <h3>Meja ${table.number}</h3>
                <div class="table-status ${table.status === 'available' ? 'status-available' : 'status-occupied'}">
                    ${table.status === 'available' ? '✅ Tersedia' : '🔴 Terisi'}
                </div>
                <div style="display: flex; gap: 0.3rem; justify-content: center; margin-top: 0.5rem;">
                    <button class="action-btn edit-btn" onclick="editTable(${table.id}, ${table.number}, '${table.status}')" style="padding: 0.2rem 0.5rem;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTable(${table.id})" style="padding: 0.2rem 0.5rem;">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tables:', error);
        const tablesGrid = document.getElementById('tablesGrid');
        if (tablesGrid) tablesGrid.innerHTML = '<div class="text-center">Gagal memuat meja</div>';
    }
}

// Edit table status
window.editTable = async (id, number, currentStatus) => {
    if (!adminToken) {
        showToast('Silakan login terlebih dahulu!', true);
        return;
    }
    
    const newStatus = prompt(`Ubah status meja ${number} (available/occupied):`, currentStatus);
    if (newStatus && (newStatus === 'available' || newStatus === 'occupied')) {
        try {
            const response = await fetch(`${API_URL}/api/admin/tables/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showToast(`Status meja ${number} diupdate menjadi ${newStatus === 'available' ? 'Tersedia' : 'Terisi'}`);
                loadTables();
                loadQRManagement();
            } else {
                showToast(data.error || 'Gagal update status', true);
            }
        } catch (error) {
            console.error('Error updating table:', error);
            showToast('Error: ' + error.message, true);
        }
    }
};

// Delete table
window.deleteTable = async (id) => {
    if (!adminToken) {
        showToast('Silakan login terlebih dahulu!', true);
        return;
    }
    
    if (confirm('Yakin ingin menghapus meja ini?')) {
        try {
            const response = await fetch(`${API_URL}/api/admin/tables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': adminToken }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showToast('Meja berhasil dihapus');
                loadTables();
                loadQRManagement();
            } else {
                showToast(data.error || 'Gagal menghapus meja', true);
            }
        } catch (error) {
            console.error('Error deleting table:', error);
            showToast('Error: ' + error.message, true);
        }
    }
};

// Add new table
async function addTable(tableNumber, status) {
    if (!adminToken) {
        showToast('Silakan login terlebih dahulu!', true);
        return;
    }
    
    if (!tableNumber || tableNumber <= 0) {
        showToast('Nomor meja tidak valid!', true);
        return;
    }
    
    try {
        showToast('Menyimpan data meja...');
        
        const response = await fetch(`${API_URL}/api/admin/tables`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken
            },
            body: JSON.stringify({ 
                number: parseInt(tableNumber), 
                status: status 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast(`Meja ${tableNumber} berhasil ditambahkan!`);
            closeAddTableModal();
            loadTables();
            loadQRManagement();
        } else {
            showToast(data.error || 'Gagal menambah meja', true);
        }
    } catch (error) {
        console.error('Error adding table:', error);
        showToast('Error: ' + error.message, true);
    }
}

// Close add table modal
function closeAddTableModal() {
    const modal = document.getElementById('addTableModal');
    const form = document.getElementById('addTableForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
}

// Add table button
const addTableBtn = document.getElementById('addTableBtn');
if (addTableBtn) {
    addTableBtn.addEventListener('click', () => {
        if (!adminToken) {
            showToast('Silakan login terlebih dahulu!', true);
            return;
        }
        const modal = document.getElementById('addTableModal');
        if (modal) modal.style.display = 'flex';
    });
}

// Add table form submit
const addTableForm = document.getElementById('addTableForm');
if (addTableForm) {
    addTableForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tableNumber = document.getElementById('tableNumber').value;
        const tableStatus = document.getElementById('tableStatus').value;
        
        if (!tableNumber) {
            showToast('Nomor meja harus diisi!', true);
            return;
        }
        
        addTable(tableNumber, tableStatus);
    });
}

// ============ QR CODE MANAGEMENT ============

// Load QR Management
async function loadQRManagement() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const grid = document.getElementById('qrManagementGrid');
        
        if (!grid) return;
        
        if (!tables || tables.length === 0) {
            grid.innerHTML = '<div class="text-center">Belum ada meja. Tambahkan meja terlebih dahulu.</div>';
            return;
        }
        
        grid.innerHTML = tables.map(table => {
            const qrData = `${API_URL}/menu.html?table=${table.number}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;
            
            return `
                <div class="qr-card" id="qr-card-${table.id}">
                    <span class="table-number-badge">Meja ${table.number}</span>
                    <div>
                        <img src="${qrUrl}" alt="QR Code Meja ${table.number}" id="qr-img-${table.id}">
                    </div>
                    <div class="qr-actions">
                        <button class="action-btn edit-btn" onclick="downloadQR('${qrUrl}', ${table.number})">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="action-btn edit-btn" onclick="printQR(${table.number})">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="action-btn edit-btn" onclick="regenerateQR(${table.id}, ${table.number})">
                            <i class="fas fa-sync"></i> Regenerate
                        </button>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 10px; color: #666; word-break: break-all;">
                        <small>${qrData}</small>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading QR:', error);
        const grid = document.getElementById('qrManagementGrid');
        if (grid) grid.innerHTML = '<div class="text-center">Gagal memuat QR</div>';
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
        <html><head><title>QR Meja ${tableNumber}</title>
        <style>
            body { text-align:center; padding:50px; font-family: Arial; }
            .qr-code img { width: 250px; height: 250px; border: 1px solid #ddd; padding: 10px; border-radius: 10px; }
            .meja-number { font-size: 24px; font-weight: bold; margin: 10px 0; color: #667eea; }
        </style>
        </head>
        <body>
            <h1>☕ Cafe IronColol</h1>
            <div class="meja-number">MEJA ${tableNumber}</div>
            <div class="qr-code"><img src="${qrUrl}" alt="QR Code Meja ${tableNumber}"></div>
            <p>Scan QR code ini untuk memesan dari meja ${tableNumber}</p>
            <p><small>${API_URL}/menu.html?table=${tableNumber}</small></p>
            <script>window.print(); setTimeout(() => window.close(), 500);<\/script>
        </body></html>
    `);
    printWindow.document.close();
};

// Regenerate QR
window.regenerateQR = async (tableId, tableNumber) => {
    try {
        const qrData = `${API_URL}/menu.html?table=${tableNumber}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;
        
        const qrImg = document.getElementById(`qr-img-${tableId}`);
        if (qrImg) {
            qrImg.src = qrUrl;
        }
        
        showToast(`QR Code Meja ${tableNumber} diregenerasi!`);
        
        await fetch(`${API_URL}/api/admin/tables/${tableId}/qr`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken
            },
            body: JSON.stringify({ qrCode: qrData, qrCodeUrl: qrUrl })
        });
    } catch (error) {
        showToast('Error: ' + error.message, true);
    }
};

// Generate all QR
const generateAllQRBtn = document.getElementById('generateAllQRBtn');
if (generateAllQRBtn) {
    generateAllQRBtn.addEventListener('click', () => {
        showToast('QR Code untuk semua meja diregenerasi');
        loadQRManagement();
    });
}

// ============ ORDER MANAGEMENT ============

// Print receipt function
function printReceipt(order) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID');
    const timeStr = now.toLocaleTimeString('id-ID');
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Struk Pesanan #${order.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; background: white; }
        .receipt { width: 280px; margin: 0 auto; }
        .receipt-header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
        .receipt-header h2 { font-size: 18px; }
        .receipt-divider { border-top: 1px dashed #000; margin: 8px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .receipt-total { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #000; font-weight: bold; }
        .receipt-footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; }
        .qr-code { text-align: center; margin: 10px 0; }
        .qr-code img { width: 80px; height: 80px; }
        @media print { body { padding: 0; margin: 0; } }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="receipt-header">
            <h2>☕ IRONCOLOL CAFE</h2>
            <p>Jl. Contoh No. 123, Jakarta</p>
            <p>Telp: (021) 1234-5678</p>
            <div class="receipt-divider"></div>
            <p>${dateStr} | ${timeStr}</p>
            <p>Kasir: Admin</p>
        </div>
        <div class="receipt-body">
            <div class="receipt-row"><span>No. Order:</span><span>#${order.id}</span></div>
            <div class="receipt-row"><span>Pelanggan:</span><span>${order.customerName || 'Walk-in Customer'}</span></div>
            ${order.tableNumber ? `<div class="receipt-row"><span>Meja:</span><span>${order.tableNumber}</span></div>` : ''}
            <div class="receipt-divider"></div>
            ${order.items ? order.items.map(item => `<div class="receipt-row"><span>${item.name} x ${item.quantity}</span><span>Rp ${(item.price * item.quantity).toLocaleString()}</span></div>`).join('') : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-row receipt-total"><span>TOTAL</span><span>Rp ${(order.total || 0).toLocaleString()}</span></div>
            ${order.paymentMethod ? `<div class="receipt-row"><span>Metode Bayar</span><span>${order.paymentMethod.toUpperCase()}</span></div>` : ''}
            ${order.tableNumber ? `<div class="qr-code"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${API_URL}/menu.html?table=${order.tableNumber}"></div>` : ''}
        </div>
        <div class="receipt-footer">
            <p>Terima kasih telah berkunjung!</p>
            <p>⭐ Follow IG @ironcolol_cafe ⭐</p>
        </div>
    </div>
    <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); };</script>
</body>
</html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
}

// Load orders - Enhanced with payment status
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/api/orders`);
        const orders = await response.json();
        const ordersList = document.getElementById('ordersList');
        
        if (!ordersList) return;
        
        if (!orders || orders.length === 0) {
            ordersList.innerHTML = '<div class="text-center">Belum ada pesanan</div>';
            return;
        }
        
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <strong>#${order.id}</strong>
                    <div>
                        <span class="order-status status-${order.status}">${order.status}</span>
                        ${order.type === 'delivery' ? '<span style="background:#667eea; color:white; padding:2px 8px; border-radius:20px; margin-left:5px; font-size:10px;">🚚 Antar</span>' : '<span style="background:#10b981; color:white; padding:2px 8px; border-radius:20px; margin-left:5px; font-size:10px;">🏠 Dine In</span>'}
                    </div>
                </div>
                <div><strong>${order.customerName || 'Meja ' + (order.tableNumber || 'Customer')}</strong></div>
                ${order.customerAddress ? `<div><small>📍 ${order.customerAddress}</small></div>` : ''}
                ${order.paymentMethod ? `<div><small>💳 ${order.paymentMethod}</small></div>` : ''}
                ${order.paymentStatus ? `<div><small>💰 Status: ${order.paymentStatus === 'paid' ? '✅ Lunas' : (order.paymentStatus === 'pending_cod' ? '⏳ COD Pending' : '🔄 Menunggu Konfirmasi')}</small></div>` : ''}
                <div class="order-items" style="margin: 0.5rem 0;">
                    ${order.items ? order.items.map(item => `<div>${item.name} x${item.quantity} = Rp ${(item.price * item.quantity).toLocaleString()}</div>`).join('') : 'Tidak ada item'}
                </div>
                <div><strong>Total: Rp ${(order.total || 0).toLocaleString()}</strong></div>
                <div class="order-actions">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" style="flex:1; padding:0.3rem; border-radius:5px;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    ${order.paymentMethod !== 'COD (Bayar di Tempat)' && order.paymentStatus !== 'paid' ? `
                        <button class="action-btn edit-btn" onclick="confirmPayment(${order.id})" style="background:#10b981;">
                            <i class="fas fa-check-circle"></i> Konfirmasi Bayar
                        </button>
                    ` : ''}
                    ${order.status === 'completed' ? `
                        <button class="print-receipt-btn" onclick='printReceipt(${JSON.stringify(order).replace(/'/g, "\\'")})'>
                            <i class="fas fa-print"></i> Cetak Struk
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        const ordersList = document.getElementById('ordersList');
        if (ordersList) ordersList.innerHTML = '<div class="text-center">Gagal memuat pesanan</div>';
    }
}

// Confirm payment function
window.confirmPayment = async (id) => {
    if (confirm('Konfirmasi pembayaran untuk pesanan ini?')) {
        try {
            const response = await fetch(`${API_URL}/api/orders/${id}/confirm-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentStatus: 'paid' })
            });
            
            if (response.ok) {
                showToast('Pembayaran dikonfirmasi!');
                loadOrders();
            } else {
                showToast('Gagal konfirmasi pembayaran', true);
            }
        } catch (error) {
            showToast('Error: ' + error.message, true);
        }
    }
};

// Update order status
window.updateOrderStatus = async (id, status) => {
    try {
        const response = await fetch(`${API_URL}/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showToast(`Status pesanan #${id} diupdate menjadi ${status}`);
            await loadOrders();
            
            if (status === 'completed') {
                const orderResponse = await fetch(`${API_URL}/api/orders/${id}`);
                const order = await orderResponse.json();
                if (confirm(`Pesanan #${id} sudah selesai. Cetak struk sekarang?`)) {
                    printReceipt(order);
                }
            }
        } else {
            showToast('Gagal update status', true);
        }
    } catch (error) {
        showToast('Error: ' + error.message, true);
    }
};

// ============ TAB NAVIGATION ============
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
        
        if (tabId === 'products') loadProducts();
        else if (tabId === 'orders') loadOrders();
        else if (tabId === 'tables') loadTables();
        else if (tabId === 'qrcode') loadQRManagement();
    });
});

// Modal close buttons
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => {
        closeProductModal();
        closeAddTableModal();
    };
});

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#ef4444' : '#1a1a2e';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Check login status
function checkLogin() {
    const savedToken = localStorage.getItem('adminToken');
    const savedUsername = localStorage.getItem('adminUsername');
    if (savedToken && savedUsername) {
        adminToken = savedToken;
        const loginModal = document.getElementById('loginModal');
        const adminPanel = document.getElementById('adminPanel');
        const adminUsername = document.getElementById('adminUsername');
        
        if (loginModal) loginModal.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        if (adminUsername) adminUsername.textContent = savedUsername;
        
        loadProducts();
        loadOrders();
        loadTables();
        loadQRManagement();
    }
}

// Initialize
checkLogin();