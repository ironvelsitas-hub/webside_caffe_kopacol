// API Configuration
let API_URL;

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = 'http://localhost:3000';
} else {
    API_URL = window.location.origin;
}

console.log('API_URL:', API_URL);

// Global variables
let html5QrCode = null;
let isScanning = false;

// ============ PROFILE SIDEBAR FUNCTIONS ============

// Update profile display
function updateProfileDisplay() {
    const userPhone = localStorage.getItem('userPhone');
    const userName = localStorage.getItem('userName');
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userPhone) {
        if (profileName) profileName.textContent = userName || 'Customer';
        if (profilePhone) profilePhone.textContent = userPhone;
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user-check"></i>';
            userAvatar.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        }
    } else {
        if (profileName) profileName.textContent = 'Guest User';
        if (profilePhone) profilePhone.textContent = 'Not logged in';
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
            userAvatar.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }
    }
}

// Open profile sidebar
function openProfileSidebar() {
    const sidebar = document.getElementById('profileSidebar');
    const overlay = document.getElementById('profileOverlay');
    if (sidebar && overlay) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Update order badge
        updateOrderBadge();
    }
}

// Close profile sidebar
function closeProfileSidebar() {
    const sidebar = document.getElementById('profileSidebar');
    const overlay = document.getElementById('profileOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Update order badge count
async function updateOrderBadge() {
    const userPhone = localStorage.getItem('userPhone');
    const badge = document.getElementById('orderBadge');
    if (!badge) return;
    
    if (!userPhone) {
        badge.textContent = '0';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/orders`);
        const orders = await response.json();
        const userOrders = orders.filter(o => o.customerPhone === userPhone);
        const pendingOrders = userOrders.filter(o => o.status === 'pending' || o.status === 'processing');
        badge.textContent = pendingOrders.length;
    } catch (error) {
        console.error('Error fetching orders:', error);
        badge.textContent = '0';
    }
}

// Show my orders
async function showMyOrders() {
    const userPhone = localStorage.getItem('userPhone');
    const modal = document.getElementById('myOrdersModal');
    const ordersList = document.getElementById('ordersHistoryList');
    
    if (!userPhone) {
        showToast('Silakan login terlebih dahulu!', true);
        closeProfileSidebar();
        return;
    }
    
    if (modal && ordersList) {
        modal.style.display = 'flex';
        ordersList.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Memuat pesanan...</div>';
        
        try {
            const response = await fetch(`${API_URL}/api/orders`);
            const orders = await response.json();
            const userOrders = orders.filter(o => o.customerPhone === userPhone).reverse();
            
            if (userOrders.length === 0) {
                ordersList.innerHTML = `
                    <div class="text-center" style="padding: 2rem;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: #ddd;"></i>
                        <p>Belum ada pesanan</p>
                        <a href="menu.html" class="btn btn-primary" style="margin-top: 1rem;">Mulai Pesan</a>
                    </div>
                `;
            } else {
                ordersList.innerHTML = userOrders.map(order => `
                    <div class="order-history-item" style="background: #f8f9fa; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <strong>#${order.id}</strong>
                            <span class="order-status status-${order.status}" style="padding: 2px 10px; border-radius: 20px; font-size: 0.7rem;">${order.status}</span>
                        </div>
                        <div style="font-size: 0.85rem;">
                            ${order.items ? order.items.map(item => `<div>${item.name} x${item.quantity}</div>`).join('') : ''}
                        </div>
                        <div style="margin-top: 0.5rem; font-weight: bold;">Total: Rp ${(order.total || 0).toLocaleString()}</div>
                        <div style="font-size: 0.7rem; color: #999;">${new Date(order.createdAt).toLocaleString('id-ID')}</div>
                        ${order.type === 'delivery' ? '<div style="font-size: 0.7rem; color: #667eea;"><i class="fas fa-motorcycle"></i> Pesanan Antar</div>' : ''}
                    </div>
                `).join('');
            }
        } catch (error) {
            ordersList.innerHTML = '<div class="text-center">Gagal memuat pesanan</div>';
        }
    }
}

// Show table info
function showTableInfo() {
    const tableNumber = localStorage.getItem('tableNumber');
    if (tableNumber) {
        showToast(`Anda sedang berada di Meja ${tableNumber}`);
    } else {
        showToast('Anda belum memilih meja. Scan QR code untuk memilih meja.');
    }
    closeProfileSidebar();
}

// Show help
function showHelp() {
    showToast('Hubungi CS: 0812-3456-7890 atau melalui WhatsApp');
    closeProfileSidebar();
}

// Logout user
function logoutUser() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userName');
        localStorage.removeItem('userLoginTime');
        localStorage.removeItem('tableNumber');
        updateProfileDisplay();
        closeProfileSidebar();
        showToast('Logout berhasil');
        
        // Refresh page to reset state
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// ============ EXISTING FUNCTIONS ============

// Load cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => el.textContent = count);
}

// Add to cart
window.addToCart = function(productId, productName, productPrice, productImage) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showToast('✓ Produk ditambahkan ke keranjang!');
};

// Show toast
function showToast(message, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = isError ? '#ef4444' : '#1a1a2e';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Check table from URL
function checkTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get('table');
    if (tableNumber) {
        localStorage.setItem('tableNumber', tableNumber);
        showToast(`Terhubung ke Meja ${tableNumber}`);
        displayTableInfoBar(tableNumber);
        return true;
    }
    return false;
}

// Display table info bar
function displayTableInfoBar(tableNumber) {
    const tableInfoBar = document.getElementById('tableInfoBar');
    const currentTableSpan = document.getElementById('currentTableNumber');
    
    if (tableNumber && tableInfoBar && currentTableSpan) {
        currentTableSpan.textContent = `Meja ${tableNumber}`;
        tableInfoBar.style.display = 'flex';
    } else if (tableInfoBar) {
        tableInfoBar.style.display = 'none';
    }
}

// Change table function
window.changeTable = function() {
    localStorage.removeItem('tableNumber');
    window.location.href = 'index.html';
};

// Load available tables from server for manual selection
async function loadAvailableTables() {
    try {
        const response = await fetch(`${API_URL}/api/tables`);
        const tables = await response.json();
        const manualTableList = document.getElementById('manualTableList');
        
        if (manualTableList) {
            if (!tables || tables.length === 0) {
                manualTableList.innerHTML = '<div class="text-center" style="grid-column: 1/-1;">Belum ada meja yang tersedia</div>';
                return;
            }
            
            const activeTables = tables.filter(t => t.isActive !== false);
            
            if (activeTables.length === 0) {
                manualTableList.innerHTML = '<div class="text-center" style="grid-column: 1/-1;">Belum ada meja aktif</div>';
                return;
            }
            
            manualTableList.innerHTML = activeTables.map(table => `
                <button class="manual-table-btn" data-table="${table.number}" style="padding: 0.8rem; background: #667eea; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem;">
                    Meja ${table.number}
                </button>
            `).join('');
            
            document.querySelectorAll('.manual-table-btn').forEach(btn => {
                btn.onclick = () => {
                    const tableNumber = btn.dataset.table;
                    localStorage.setItem('tableNumber', tableNumber);
                    showToast(`Terhubung ke Meja ${tableNumber}`);
                    const manualModal = document.getElementById('manualTableModal');
                    if (manualModal) manualModal.style.display = 'none';
                    window.location.href = `menu.html?table=${tableNumber}`;
                };
            });
        }
    } catch (error) {
        console.error('Error loading tables:', error);
        const manualTableList = document.getElementById('manualTableList');
        if (manualTableList) {
            manualTableList.innerHTML = '<div class="text-center" style="grid-column: 1/-1;">Gagal memuat daftar meja</div>';
        }
    }
}

// Start QR Scanner
async function startQrScanner() {
    const qrReaderId = "qr-reader";
    const qrStatus = document.getElementById('qr-status');
    
    if (typeof Html5Qrcode === 'undefined') {
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Library tidak tersedia. Silakan pilih meja manual.';
            qrStatus.style.background = '#fee2e2';
            qrStatus.style.color = '#dc2626';
        }
        return;
    }
    
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch(e) {}
        html5QrCode = null;
    }
    
    const readerElement = document.getElementById(qrReaderId);
    if (readerElement) {
        readerElement.innerHTML = '';
    }
    
    html5QrCode = new Html5Qrcode(qrReaderId);
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                console.log("Scanned:", decodedText);
                handleScanResult(decodedText);
            },
            (errorMessage) => {
                console.debug("Scanning...");
            }
        );
        
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-camera"></i> Kamera aktif, arahkan ke QR code...';
            qrStatus.style.background = '#d1fae5';
            qrStatus.style.color = '#059669';
        }
        
    } catch (err) {
        console.error("Error starting scanner:", err);
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Tidak dapat mengakses kamera. Silakan pilih meja manual.';
            qrStatus.style.background = '#fee2e2';
            qrStatus.style.color = '#dc2626';
        }
        showToast('Kamera tidak tersedia, gunakan pilihan manual', true);
    }
}

// Stop QR Scanner
async function stopQrScanner() {
    if (html5QrCode && isScanning) {
        try {
            await html5QrCode.stop();
            isScanning = false;
        } catch(e) {}
        html5QrCode = null;
    }
}

// Handle scan result
function handleScanResult(decodedText) {
    let tableNumber = null;
    
    if (decodedText.includes('table=')) {
        const match = decodedText.match(/table=(\d+)/);
        if (match) tableNumber = match[1];
    }
    else if (/^\d+$/.test(decodedText.trim())) {
        tableNumber = decodedText.trim();
    }
    else {
        const match = decodedText.match(/(\d+)/);
        if (match && match[1] >= 1) {
            tableNumber = match[1];
        }
    }
    
    if (tableNumber && tableNumber >= 1) {
        stopQrScanner();
        localStorage.setItem('tableNumber', tableNumber);
        showToast(`✅ Terhubung ke Meja ${tableNumber}!`);
        
        const modal = document.getElementById('qrModal');
        if (modal) modal.style.display = 'none';
        
        setTimeout(() => {
            window.location.href = `menu.html?table=${tableNumber}`;
        }, 500);
    } else {
        showToast("QR Code tidak valid. Scan ulang QR code meja.", true);
    }
}

// Initialize QR Scanner
function initQRScanner() {
    const qrModal = document.getElementById('qrModal');
    const scanBtn = document.getElementById('scanQRBtn');
    
    if (!scanBtn || !qrModal) return;
    
    const closeBtn = qrModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            stopQrScanner();
            qrModal.style.display = 'none';
        };
    }
    
    scanBtn.onclick = async () => {
        qrModal.style.display = 'block';
        await startQrScanner();
    };
    
    const manualBtn = document.getElementById('manualTableBtn');
    const manualModal = document.getElementById('manualTableModal');
    
    if (manualBtn && manualModal) {
        const closeManual = manualModal.querySelector('.close-manual');
        
        manualBtn.onclick = () => {
            stopQrScanner();
            qrModal.style.display = 'none';
            manualModal.style.display = 'block';
            loadAvailableTables();
        };
        
        if (closeManual) {
            closeManual.onclick = () => {
                manualModal.style.display = 'none';
            };
        }
    }
}

// Load menu products
async function loadMenu(category = 'all') {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;
    
    displayTableInfoBar(localStorage.getItem('tableNumber'));
    
    menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Memuat menu...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        if (!products || products.length === 0) {
            menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem;">Belum ada produk</div>';
            return;
        }
        
        let filteredProducts = products;
        if (category !== 'all') {
            filteredProducts = products.filter(p => p.category === category);
        }
        
        if (filteredProducts.length === 0) {
            menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem;">Tidak ada produk dalam kategori ini</div>';
            return;
        }
        
        menuGrid.innerHTML = filteredProducts.map(product => `
            <div class="product-card animate-fadeIn">
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(product.description || 'Nikmati kelezatan produk kami')}</p>
                    <p class="product-price">Rp ${Number(product.price).toLocaleString()}</p>
                    <button class="add-to-cart" onclick="addToCart(${product.id}, '${escapeHtml(product.name)}', ${product.price}, '${product.image}')">
                        <i class="fas fa-shopping-cart"></i> Tambah ke Keranjang
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        menuGrid.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: red;">
                <i class="fas fa-exclamation-triangle"></i> Gagal memuat menu.<br>
                Error: ${error.message}<br><br>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        `;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setupCategoryFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    if (filters.length === 0) return;
    
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            filters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            loadMenu(filter.dataset.category);
        });
    });
}

function displayTableInfo() {
    const tableNumber = localStorage.getItem('tableNumber');
    const tableInfoDiv = document.getElementById('tableInfo');
    
    if (tableNumber && tableInfoDiv) {
        tableInfoDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.8rem; border-radius: 10px; text-align: center; margin-bottom: 1rem;">
                <i class="fas fa-chair"></i> Anda berada di <strong>Meja ${tableNumber}</strong>
                <button onclick="clearTableNumber()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; margin-left: 0.5rem; cursor: pointer;">
                    <i class="fas fa-times"></i> Ganti
                </button>
            </div>
        `;
    }
}

window.clearTableNumber = function() {
    localStorage.removeItem('tableNumber');
    showToast('Nomor meja dihapus');
    setTimeout(() => window.location.reload(), 500);
};

// Event listeners
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

window.onclick = (event) => {
    const qrModal = document.getElementById('qrModal');
    const manualModal = document.getElementById('manualTableModal');
    const ordersModal = document.getElementById('myOrdersModal');
    const sidebar = document.getElementById('profileSidebar');
    const overlay = document.getElementById('profileOverlay');
    
    if (event.target === qrModal) {
        stopQrScanner();
        qrModal.style.display = 'none';
    }
    if (event.target === manualModal) {
        manualModal.style.display = 'none';
    }
    if (event.target === ordersModal) {
        ordersModal.style.display = 'none';
    }
    if (event.target === overlay) {
        closeProfileSidebar();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    checkTableFromURL();
    displayTableInfo();
    updateProfileDisplay();
    
    const savedTableNumber = localStorage.getItem('tableNumber');
    if (savedTableNumber && window.location.pathname.includes('menu.html')) {
        displayTableInfoBar(savedTableNumber);
    }
    
    if (document.getElementById('menuGrid')) {
        loadMenu();
        setupCategoryFilters();
    }
    
    initQRScanner();
    
    // Profile sidebar event listeners
    const profileAvatarBtn = document.getElementById('profileAvatarBtn');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const myOrdersBtn = document.getElementById('myOrdersBtn');
    const myTableBtn = document.getElementById('myTableBtn');
    const helpBtn = document.getElementById('helpBtn');
    const logoutMenuItem = document.getElementById('logoutMenuItem');
    const ordersModalClose = document.querySelector('#myOrdersModal .close-orders');
    
    if (profileAvatarBtn) {
        profileAvatarBtn.addEventListener('click', openProfileSidebar);
    }
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeProfileSidebar);
    }
    if (myOrdersBtn) {
        myOrdersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMyOrders();
        });
    }
    if (myTableBtn) {
        myTableBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTableInfo();
        });
    }
    if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHelp();
        });
    }
    if (logoutMenuItem) {
        logoutMenuItem.addEventListener('click', logoutUser);
    }
    if (ordersModalClose) {
        ordersModalClose.onclick = () => {
            document.getElementById('myOrdersModal').style.display = 'none';
        };
    }
});