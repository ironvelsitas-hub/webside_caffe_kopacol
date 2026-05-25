// API Configuration - Fix for Vercel
let API_URL;

// Deteksi environment
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    API_URL = 'http://localhost:3000';
} else {
    // Production on Vercel - gunakan URL yang sama
    API_URL = window.location.origin;
}

console.log('API_URL:', API_URL);
console.log('Environment:', window.location.hostname);

// Global variables
let html5QrCode = null;

// Load cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => el.textContent = count);
}

// Add to cart function
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
    showToast('Produk ditambahkan ke keranjang!');
};

// Show toast notification
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

// Check for table number in URL
function checkTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get('table');
    if (tableNumber) {
        localStorage.setItem('tableNumber', tableNumber);
        showToast(`Terhubung ke Meja ${tableNumber}`);
        return true;
    }
    return false;
}

// Start QR Scanner
async function startQrScanner() {
    const qrReaderId = "qr-reader";
    const qrStatus = document.getElementById('qr-status');
    
    if (typeof Html5Qrcode === 'undefined') {
        if (qrStatus) {
            qrStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Library scanner tidak tersedia. Silakan pilih meja manual.';
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
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
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
        if (match && match[1] >= 1 && match[1] <= 10) {
            tableNumber = match[1];
        }
    }
    
    if (tableNumber && tableNumber >= 1 && tableNumber <= 10) {
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
        };
        
        if (closeManual) {
            closeManual.onclick = () => {
                manualModal.style.display = 'none';
            };
        }
        
        document.querySelectorAll('.manual-table-btn').forEach(btn => {
            btn.onclick = () => {
                const tableNumber = btn.dataset.table;
                localStorage.setItem('tableNumber', tableNumber);
                showToast(`Terhubung ke Meja ${tableNumber}`);
                manualModal.style.display = 'none';
                window.location.href = `menu.html?table=${tableNumber}`;
            };
        });
    }
}

// Load menu products - FIXED for Vercel
async function loadMenu(category = 'all') {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuGrid) return;
    
    menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Memuat menu...</div>';
    
    try {
        const apiUrl = `${API_URL}/api/products`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        console.log('Products loaded:', products.length);
        
        if (!products || products.length === 0) {
            menuGrid.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <i class="fas fa-info-circle"></i> Belum ada produk.<br>
                    Silakan tambahkan produk melalui admin panel.
                </div>
            `;
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
        console.error('Error loading menu:', error);
        menuGrid.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: red;">
                <i class="fas fa-exclamation-triangle"></i> Gagal memuat menu.<br>
                Error: ${error.message}<br><br>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-sync"></i> Refresh Halaman
                </button>
                <br><br>
                <small>API URL: ${API_URL}</small>
            </div>
        `;
    }
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Category filters
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

// Display table number
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

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Close modal when clicking outside
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
    console.log('DOM loaded, initializing...');
    updateCartCount();
    checkTableFromURL();
    displayTableInfo();
    
    if (document.getElementById('menuGrid')) {
        loadMenu();
        setupCategoryFilters();
    }
    
    initQRScanner();
});