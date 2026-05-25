// API Configuration
const API_URL = window.location.origin || 'http://localhost:3000';

// Global variables
let videoElement = null;
let scanInterval = null;
let isScanning = false;

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
        toast.style.background = '#1a1a2e';
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

// Start camera scanner
async function startCamera() {
    const video = document.getElementById('video');
    const statusDiv = document.getElementById('scan-status');
    
    if (!video) return;
    
    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();
        
        statusDiv.innerHTML = '<span style="color: green;"><i class="fas fa-camera"></i> Kamera aktif, arahkan ke QR code...</span>';
        isScanning = true;
        
        // Start scanning
        startQRScanning();
        
    } catch (err) {
        console.error('Camera error:', err);
        statusDiv.innerHTML = '<span style="color: red;"><i class="fas fa-exclamation-triangle"></i> Kamera tidak tersedia. Silakan masukkan nomor meja manual.</span>';
        showToast('Tidak dapat mengakses kamera. Gunakan input manual.', true);
    }
}

// Stop camera
function stopCamera() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    const video = document.getElementById('video');
    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    isScanning = false;
}

// Start QR scanning using ZXing
function startQRScanning() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!video || !canvas) return;
    
    // Clear previous interval
    if (scanInterval) clearInterval(scanInterval);
    
    scanInterval = setInterval(() => {
        if (!isScanning || video.readyState !== 4) return;
        
        try {
            // Set canvas size to match video
            if (video.videoWidth > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Use ZXing to decode QR code
                if (typeof ZXing !== 'undefined') {
                    const codeReader = new ZXing.BrowserQRCodeReader();
                    const img = new Image();
                    img.src = canvas.toDataURL();
                    
                    codeReader.decodeFromImage(img).then(result => {
                        if (result && result.text) {
                            onScanSuccess(result.text);
                        }
                    }).catch(err => {
                        // No QR found, continue scanning
                    });
                }
            }
        } catch (err) {
            console.debug('Scan error:', err);
        }
    }, 500);
}

// Alternative: Use simple method to check for QR code
function captureAndCheckQR() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!video || !canvas || video.readyState !== 4) return;
    
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Check for QR code in the image (simplified)
        // This is a placeholder - in practice, you'd use a proper QR library
        const statusDiv = document.getElementById('scan-status');
        if (statusDiv && Math.random() > 0.99) {
            // Simulated QR detection for demo
            // In real implementation, use actual QR detection
        }
    } catch (err) {
        console.debug('Capture error:', err);
    }
}

// Handle successful scan
function onScanSuccess(decodedText) {
    console.log("Scanned:", decodedText);
    
    let tableNumber = null;
    
    // Extract table number from QR content
    if (decodedText.includes('table=')) {
        const match = decodedText.match(/table=(\d+)/);
        if (match) tableNumber = match[1];
    } else if (/^\d+$/.test(decodedText)) {
        tableNumber = decodedText;
    } else if (decodedText.match(/\/(\d+)$/)) {
        const match = decodedText.match(/\/(\d+)$/);
        if (match) tableNumber = match[1];
    }
    
    if (tableNumber && tableNumber >= 1 && tableNumber <= 10) {
        stopCamera();
        localStorage.setItem('tableNumber', tableNumber);
        showToast(`✅ Terhubung ke Meja ${tableNumber}!`);
        
        const modal = document.getElementById('qrModal');
        if (modal) modal.style.display = 'none';
        
        window.location.href = `menu.html?table=${tableNumber}`;
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
            stopCamera();
            qrModal.style.display = 'none';
        };
    }
    
    scanBtn.onclick = async () => {
        qrModal.style.display = 'block';
        await startCamera();
    };
    
    // Manual table selection
    const manualBtn = document.getElementById('manualTableBtn');
    const manualModal = document.getElementById('manualTableModal');
    
    if (manualBtn && manualModal) {
        const closeManual = manualModal.querySelector('.close-manual');
        
        manualBtn.onclick = () => {
            stopCamera();
            qrModal.style.display = 'none';
            manualModal.style.display = 'block';
        };
        
        if (closeManual) {
            closeManual.onclick = () => {
                manualModal.style.display = 'none';
            };
        }
        
        // Table number buttons
        document.querySelectorAll('.table-number-btn').forEach(btn => {
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

// Load menu products
async function loadMenu(category = 'all') {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) throw new Error('Network error');
        const products = await response.json();
        
        let filteredProducts = products;
        if (category !== 'all') {
            filteredProducts = products.filter(p => p.category === category);
        }
        
        const menuGrid = document.getElementById('menuGrid');
        if (menuGrid) {
            if (filteredProducts.length === 0) {
                menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem;">Tidak ada produk</div>';
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
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        const menuGrid = document.getElementById('menuGrid');
        if (menuGrid) {
            menuGrid.innerHTML = '<div class="text-center" style="padding: 2rem; color: red;">Gagal memuat menu. Pastikan server backend berjalan.</div>';
        }
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
                <i class="fas fa-chair"></i> Anda sedang berada di <strong>Meja ${tableNumber}</strong>
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
        stopCamera();
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
    
    if (document.getElementById('menuGrid')) {
        loadMenu();
        setupCategoryFilters();
    }
    
    initQRScanner();
});