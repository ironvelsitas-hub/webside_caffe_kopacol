const API_URL = 'http://localhost:3000/api';

// Load cart items
function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartContent = document.getElementById('cartContent');
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    
    if (!cartContent) return;
    
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang masih kosong</p>
                <a href="menu.html" class="btn btn-primary">Mulai Belanja</a>
            </div>
        `;
        return;
    }
    
    cartContent.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
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
            <button class="checkout-btn" onclick="checkout()">
                <i class="fas fa-credit-card"></i> Lanjut ke Pembayaran
            </button>
        </div>
    `;
    
    if (cartItemsDiv && cartTotalSpan) {
        cartItemsDiv.innerHTML = cart.map(item => `
            <div class="cart-item">
                <span>${item.name} x${item.quantity}</span>
                <span>Rp ${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `).join('');
        cartTotalSpan.textContent = `Rp ${calculateTotal(cart).toLocaleString()}`;
    }
}

function calculateTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

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
    }
};

window.removeFromCart = (id) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => el.textContent = count);
}

// Checkout process
window.checkout = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) return;
    
    const total = calculateTotal(cart);
    const paymentModal = document.getElementById('paymentModal');
    
    if (paymentModal) {
        paymentModal.style.display = 'block';
        
        document.getElementById('confirmPayment').onclick = async () => {
            const orderData = {
                items: cart,
                total: total,
                status: 'pending',
                createdAt: new Date().toISOString(),
                tableNumber: localStorage.getItem('tableNumber') || null,
                customerName: document.getElementById('customerName')?.value,
                customerPhone: document.getElementById('customerPhone')?.value,
                customerAddress: document.getElementById('customerAddress')?.value,
                note: document.getElementById('orderNote')?.value
            };
            
            try {
                const response = await fetch(`${API_URL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                
                if (response.ok) {
                    localStorage.removeItem('cart');
                    alert('Pesanan berhasil! Silahkan tunggu konfirmasi.');
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Error creating order:', error);
                alert('Gagal memproses pesanan');
            }
        };
    }
};

// Delivery form submission
document.getElementById('deliveryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    window.location.href = 'cart.html';
});

// Close modal
const modal = document.getElementById('paymentModal');
const closeBtn = modal?.querySelector('.close');

if (closeBtn) {
    closeBtn.onclick = () => modal.style.display = 'none';
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartCount();
});