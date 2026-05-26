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
            
            // Filter hanya meja yang aktif
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
            
            // Add event listeners to buttons
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
    
    // Cek library
    if (typeof Html5Qrcode === 'undefined') {
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Library tidak tersedia. Silakan pilih meja manual.';
            qrStatus.style.background = '#fee2e2';
            qrStatus.style.color = '#dc2626';
        }
        showToast('Scanner tidak tersedia, gunakan pilihan manual', true);
        return;
    }
    
    // Bersihkan scanner lama
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch(e) {}
        html5QrCode = null;
    }
    
    // Buat container untuk scanner
    let readerContainer = document.getElementById(qrReaderId);
    if (!readerContainer) {
        readerContainer = document.createElement('div');
        readerContainer.id = qrReaderId;
        readerContainer.style.width = '100%';
        const modalContent = document.querySelector('#qrModal .modal-content');
        if (modalContent) {
            const videoContainer = modalContent.querySelector('.scanner-container');
            if (videoContainer) {
                videoContainer.appendChild(readerContainer);
            }
        }
    }
    
    if (readerContainer) {
        readerContainer.innerHTML = '';
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
                // Silent error
                console.debug("Scanning...");
            }
        );
        
        isScanning = true;
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-camera"></i> Kamera aktif, arahkan ke QR code...';
            qrStatus.style.background = '#d1fae5';
            qrStatus.style.color = '#059669';
        }
        showToast('Kamera dimulai, arahkan ke QR code meja');
        
    } catch (err) {
        console.error("Error:", err);
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Tidak dapat akses kamera. ' + err.message;
            qrStatus.style.background = '#fee2e2';
            qrStatus.style.color = '#dc2626';
        }
        showToast('Tidak dapat akses kamera, gunakan pilihan manual', true);
    }
}

// Stop scanner
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
    
    // Extract nomor meja dari berbagai format
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
        // Update status
        const qrStatus = document.getElementById('qr-status');
        if (qrStatus) {
            qrStatus.innerHTML = `<i class="fas fa-check-circle"></i> Berhasil! Meja ${tableNumber} terdeteksi`;
            qrStatus.style.background = '#d1fae5';
            qrStatus.style.color = '#059669';
        }
        
        stopQrScanner();
        localStorage.setItem('tableNumber', tableNumber);
        showToast(`✅ Terhubung ke Meja ${tableNumber}!`);
        
        const modal = document.getElementById('qrModal');
        if (modal) modal.style.display = 'none';
        
        setTimeout(() => {
            window.location.href = `menu.html?table=${tableNumber}`;
        }, 500);
    } else {
        showToast("QR Code tidak valid. Scan ulang QR code meja yang benar.", true);
    }
}

// Initialize QR Scanner UI
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
    
    const stopScanBtn = document.getElementById('stopScanBtn');
    if (stopScanBtn) {
        stopScanBtn.onclick = () => {
            stopQrScanner();
            const qrStatus = document.getElementById('qr-status');
            if (qrStatus) {
                qrStatus.innerHTML = '<i class="fas fa-stop"></i> Scanner dihentikan';
                qrStatus.style.background = '#fee2e2';
                qrStatus.style.color = '#dc2626';
            }
        };
    }
    
    const manualBtn = document.getElementById('manualTableBtn');
    const manualModal = document.getElementById('manualTableModal');
    
    if (manualBtn && manualModal) {
        const closeManual = manualModal.querySelector('.close-manual');
        
        manualBtn.onclick = () => {
            stopQrScanner();
            qrModal.style.display = 'none';
            manualModal.style.display = 'block';
            // Load daftar meja saat modal manual dibuka
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
    
    // Display table info on menu page
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
    
    if (event.target === qrModal) {
        stopQrScanner();
        qrModal.style.display = 'none';
    }
    if (event.target === manualModal) {
        manualModal.style.display = 'none';
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    checkTableFromURL();
    displayTableInfo();
    
    // Display table info bar if table number exists
    const savedTableNumber = localStorage.getItem('tableNumber');
    if (savedTableNumber && window.location.pathname.includes('menu.html')) {
        displayTableInfoBar(savedTableNumber);
    }
    
    if (document.getElementById('menuGrid')) {
        loadMenu();
        setupCategoryFilters();
    }
    
    initQRScanner();
});