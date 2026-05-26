// API Configuration
const API_URL = window.location.origin || 'http://localhost:3000';
let selectedPaymentMethod = null;

// Load cart items
function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartContent = document.getElementById('cartContent');
    const paymentSection = document.getElementById('paymentSection');
    
    if (!cartContent) return;
    
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang masih kosong</p>
                <a href="menu.html" class="btn btn-primary">Mulai Belanja</a>
            </div>
        `;
        if (paymentSection) paymentSection.style.display = 'none';
        return;
    }
    
    cartContent.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80'">
                    <div class="cart-item-info">
                        <h4>${escapeHtml(item.name)}</h4>
                        <p class="cart-item-price">Rp ${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary">
            <div class="cart-total">
                <span>Total:</span>
                <span>Rp ${calculateTotal(cart).toLocaleString()}</span>
            </div>
            <button class="checkout-btn" onclick="showPaymentMethods()">
                <i class="fas fa-credit-card"></i> Lanjut ke Pembayaran
            </button>
        </div>
    `;
    
    if (paymentSection) paymentSection.style.display = 'none';
    updateCartCount();
}

function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Show payment methods
function showPaymentMethods() {
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
        paymentSection.style.display = 'block';
        document.getElementById('cartContent').scrollIntoView({ behavior: 'smooth' });
        
        // Setup payment option click handlers
        setupPaymentOptions();
    }
}

// Setup payment options
function setupPaymentOptions() {
    const options = document.querySelectorAll('.payment-option');
    options.forEach(option => {
        option.onclick = () => {
            // Remove selected class from all
            options.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked
            option.classList.add('selected');
            
            // Get selected method
            selectedPaymentMethod = option.dataset.method;
            
            // Hide all payment details
            document.querySelectorAll('.payment-detail').forEach(detail => {
                detail.classList.remove('active');
            });
            
            // Show selected payment detail
            const detailId = `${selectedPaymentMethod}Detail`;
            const selectedDetail = document.getElementById(detailId);
            if (selectedDetail) {
                selectedDetail.classList.add('active');
            }
        };
    });
}

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Nomor rekening disalin!');
    });
};

// Konfirmasi pembayaran
document.getElementById('confirmPaymentBtn')?.addEventListener('click', async () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        showToast('Keranjang kosong!', true);
        return;
    }
    
    if (!selectedPaymentMethod) {
        showToast('Pilih metode pembayaran terlebih dahulu!', true);
        return;
    }
    
    const paymentProof = document.getElementById('paymentProof').files[0];
    if (!paymentProof) {
        showToast('Upload bukti pembayaran terlebih dahulu!', true);
        return;
    }
    
    // Get table number from localStorage
    const tableNumber = localStorage.getItem('tableNumber');
    const customerName = localStorage.getItem('customerName') || 'Customer';
    
    // Create order data
    const orderData = {
        items: cart,
        total: calculateTotal(cart),
        status: 'pending',
        paymentMethod: selectedPaymentMethod,
        paymentStatus: 'waiting_confirmation',
        tableNumber: tableNumber,
        customerName: customerName,
        createdAt: new Date().toISOString(),
        paymentProof: paymentProof.name
    };
    
    try {
        // Simpan bukti pembayaran ke localStorage (simulasi)
        const reader = new FileReader();
        reader.onload = async function(e) {
            // Save payment proof to localStorage
            const paymentData = {
                proof: e.target.result,
                fileName: paymentProof.name,
                uploadTime: new Date().toISOString()
            };
            localStorage.setItem('lastPaymentProof', JSON.stringify(paymentData));
            
            // Send order to backend
            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                // Clear cart
                localStorage.removeItem('cart');
                localStorage.removeItem('tableNumber');
                
                // Show success modal
                document.getElementById('successModal').style.display = 'flex';
                
                // Update cart count
                updateCartCount();
                
                // Clear payment section
                document.getElementById('paymentSection').style.display = 'none';
                
                showToast('Pesanan berhasil! Terima kasih sudah order.');
            } else {
                showToast('Gagal memproses pesanan', true);
            }
        };
        reader.readAsDataURL(paymentProof);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error: ' + error.message, true);
    }
});

// Update quantity
window.updateQuantity = (id, delta) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemIndex = cart.findIndex(item => item.id === id);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += delta;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
        updateCartCount();
        
        // Hide payment section if cart becomes empty
        if (cart.length === 0) {
            document.getElementById('paymentSection').style.display = 'none';
        }
    }
};

// Remove from cart
window.removeFromCart = (id) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
    
    if (cart.length === 0) {
        document.getElementById('paymentSection').style.display = 'none';
    }
};

// Update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => el.textContent = count);
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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modal when clicking outside
window.onclick = (event) => {
    const successModal = document.getElementById('successModal');
    if (event.target === successModal) {
        successModal.style.display = 'none';
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartCount();
    
    // Setup QR code refresh
    const refreshQR = () => {
        const timestamp = Date.now();
        const qrisImg = document.getElementById('qrisImage');
        if (qrisImg) {
            qrisImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QRIS_IRONCOLOL_${timestamp}`;
        }
    };
    
    // Refresh QR every 5 minutes
    setInterval(refreshQR, 300000);
});