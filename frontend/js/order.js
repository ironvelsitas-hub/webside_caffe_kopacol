// API Configuration
const API_URL = window.location.origin || 'http://localhost:3000';

// Load cart and display
function loadCartForOrder() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsDiv = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    const cartItemsList = document.getElementById('cartItemsList');
    
    if (cart.length === 0) {
        cartItemsList.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsList.style.display = 'none';
    cartSummary.style.display = 'block';
    
    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item-order">
            <span>${item.name} x${item.quantity}</span>
            <span>Rp ${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `Rp ${total.toLocaleString()}`;
    
    return total;
}

// Update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => el.textContent = count);
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

// Proceed to payment
document.getElementById('proceedToPaymentBtn')?.addEventListener('click', () => {
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    
    if (!customerName || !customerPhone || !customerAddress) {
        showToast('Harap isi semua data pemesan!', true);
        return;
    }
    
    // Save customer data
    localStorage.setItem('orderCustomer', JSON.stringify({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        note: document.getElementById('orderNote').value
    }));
    
    document.getElementById('paymentModal').style.display = 'flex';
});

// Payment method selection
document.querySelectorAll('.payment-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        const paymentDetailModal = document.getElementById('paymentDetailModal');
        const paymentDetailContent = document.getElementById('paymentDetailContent');
        
        let content = '';
        if (method === 'transfer') {
            content = `
                <h3 style="text-align:center;"><i class="fas fa-university"></i> Transfer Bank</h3>
                <div style="margin: 1rem 0;">
                    <p><strong>Bank BCA</strong></p>
                    <p>No. Rekening: 123 456 7890</p>
                    <p>a.n Cafe IronColol</p>
                    <hr style="margin: 0.5rem 0;">
                    <p><strong>Bank BRI</strong></p>
                    <p>No. Rekening: 0987 6543 210</p>
                    <p>a.n Cafe IronColol</p>
                </div>
                <p style="background: #fef3c7; padding: 0.5rem; border-radius: 8px;">
                    <i class="fas fa-info-circle"></i> Transfer sesuai total pesanan, lalu upload bukti pembayaran.
                </p>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Upload Bukti Transfer</label>
                    <input type="file" id="paymentProof" accept="image/*">
                </div>
            `;
        } else if (method === 'qris') {
            content = `
                <h3 style="text-align:center;"><i class="fas fa-qrcode"></i> QRIS</h3>
                <div style="text-align: center; margin: 1rem 0;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QRIS_IRONCOLOL_CAFE" style="width: 180px; height: 180px;">
                    <p>Scan QR Code menggunakan aplikasi mobile banking atau e-wallet</p>
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Upload Bukti Pembayaran</label>
                    <input type="file" id="paymentProof" accept="image/*">
                </div>
            `;
        } else if (method === 'cod') {
            content = `
                <h3 style="text-align:center;"><i class="fas fa-money-bill-wave"></i> Bayar di Tempat (COD)</h3>
                <div style="margin: 1rem 0; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981;"></i>
                    <p>Pembayaran akan dilakukan saat pesanan sampai</p>
                    <p style="color: #666; margin-top: 0.5rem;">Pastikan Anda memiliki uang pas untuk membayar</p>
                </div>
                <input type="hidden" id="paymentProof">
            `;
        }
        
        paymentDetailContent.innerHTML = content;
        paymentDetailModal.style.display = 'flex';
        
        // Store selected method
        paymentDetailModal.dataset.method = method;
    });
});

// Confirm payment
document.getElementById('confirmPaymentDetailBtn')?.addEventListener('click', async () => {
    const modal = document.getElementById('paymentDetailModal');
    const method = modal.dataset.method;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const customer = JSON.parse(localStorage.getItem('orderCustomer') || '{}');
    
    if (cart.length === 0) {
        showToast('Keranjang kosong!', true);
        return;
    }
    
    // Handle payment proof
    let paymentProof = null;
    const proofInput = document.getElementById('paymentProof');
    if (proofInput && proofInput.files && proofInput.files[0]) {
        const file = proofInput.files[0];
        paymentProof = await convertToBase64(file);
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
        items: cart,
        total: total,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        note: customer.note || '',
        paymentMethod: method === 'cod' ? 'COD (Bayar di Tempat)' : (method === 'qris' ? 'QRIS' : 'Transfer Bank'),
        paymentStatus: method === 'cod' ? 'pending_cod' : 'waiting_confirmation',
        paymentProof: paymentProof,
        status: 'pending',
        type: 'delivery',
        createdAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            // Clear cart and customer data
            localStorage.removeItem('cart');
            localStorage.removeItem('orderCustomer');
            updateCartCount();
            
            // Close modals
            document.getElementById('paymentModal').style.display = 'none';
            modal.style.display = 'none';
            
            // Show success modal
            document.getElementById('successModal').style.display = 'flex';
            
            showToast('Pesanan berhasil! Menunggu konfirmasi kasir.');
        } else {
            showToast('Gagal memproses pesanan', true);
        }
    } catch (error) {
        showToast('Error: ' + error.message, true);
    }
});

// Helper function to convert file to base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Close modals
document.querySelectorAll('.close-payment, .close-detail').forEach(btn => {
    btn.onclick = () => {
        document.getElementById('paymentModal').style.display = 'none';
        document.getElementById('paymentDetailModal').style.display = 'none';
    };
});

// Close modal on outside click
window.onclick = (event) => {
    if (event.target === document.getElementById('paymentModal')) {
        document.getElementById('paymentModal').style.display = 'none';
    }
    if (event.target === document.getElementById('paymentDetailModal')) {
        document.getElementById('paymentDetailModal').style.display = 'none';
    }
    if (event.target === document.getElementById('successModal')) {
        document.getElementById('successModal').style.display = 'none';
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCartForOrder();
    updateCartCount();
});