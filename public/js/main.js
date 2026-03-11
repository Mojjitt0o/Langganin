// public/js/main.js

// Global variables
const API_BASE_URL = '/api';
let currentUser = null;

// Utility Functions
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}; 

const showLoading = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="spinner"></div>';
    }
};

const hideLoading = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
};

const showAlert = (message, type = 'info') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
};

// Authentication Functions
const Auth = {
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getToken: () => {
        return localStorage.getItem('token');
    },

    setToken: (token) => {
        localStorage.setItem('token', token);
    },

    removeToken: () => {
        localStorage.removeItem('token');
    },

    getUser: async () => {
        if (!Auth.isAuthenticated()) return null;
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                currentUser = data.data;
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    },

    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                Auth.setToken(data.data.token);
                currentUser = data.data.user;
                showAlert('Login berhasil!', 'success');
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Terjadi kesalahan saat login', 'danger');
            throw error;
        }
    },

    register: async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Registrasi berhasil! Silakan login.', 'success');
            }
            
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            showAlert('Terjadi kesalahan saat registrasi', 'danger');
            throw error;
        }
    },

    logout: () => {
        Auth.removeToken();
        currentUser = null;
        showAlert('Logout berhasil', 'success');
        window.location.href = '/login';
    },

    checkAuth: () => {
        const token = Auth.getToken();
        if (!token) {
            window.location.href = '/login';
            return false;
        }
        return true;
    },

    updateNavbar: async () => {
        const navbarMenu = document.getElementById('navbarMenu');
        if (!navbarMenu) return;

        const isAuth = Auth.isAuthenticated();
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const balanceDisplay = document.getElementById('balanceDisplay');

        if (isAuth) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            
            // Fetch user data
            const user = await Auth.getUser();
            if (user && balanceDisplay) {
                balanceDisplay.textContent = formatRupiah(user.balance);
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (balanceDisplay) balanceDisplay.style.display = 'none';
        }
    }
};

// Product Functions
const Product = {
    getAll: async () => {
        try {
            const headers = {};
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/products`, { headers });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            showAlert('Gagal mengambil data produk', 'danger');
            throw error;
        }
    },

    getVariants: async (productId) => {
        try {
            const headers = {};
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/products/${productId}/variants`, { headers });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching variants:', error);
            throw error;
        }
    },

    renderProducts: (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        products.forEach(product => {
            const productCard = Product.createProductCard(product);
            container.appendChild(productCard);
        });
    },

    createProductCard: (product) => {
        const card = document.createElement('div');
        card.className = 'product-card';

        let variantsHtml = '';
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                if (variant.id) {
                    variantsHtml += Product.createVariantHtml(variant, product.name);
                }
            });
        }

        // Product image dengan fallback jika tidak ada
        const imageHtml = product.image_url 
            ? `<div class="product-image">
                   <img src="${product.image_url}" alt="${product.name}" onerror="this.parentElement.style.display='none'">
               </div>` 
            : '';

        card.innerHTML = `
            ${imageHtml}
            <div class="product-header">
                <div class="product-title">${product.name}</div>
                <div class="product-category">${product.category || 'Uncategorized'}</div>
            </div>
            <div class="product-body">
                <p class="product-description">${product.description || 'No description available'}</p>
                <div class="variant-list">
                    ${variantsHtml}
                </div>
            </div>
        `;

        return card;
    },

    createVariantHtml: (variant, productName) => {
        const isLoggedIn = !!Auth.getToken();
        
        // Buat harga "normal" pura-pura (30% lebih tinggi dari harga jual untuk kesan diskon)
        const fakeNormalPrice = Math.round(variant.our_price * 1.3);
        const discountPercent = Math.round(((fakeNormalPrice - variant.our_price) / fakeNormalPrice) * 100);
        
        // Tombol beli hanya muncul jika sudah login
        const buyButton = isLoggedIn 
            ? `<button class="btn-buy" onclick="Order.openModal('${variant.id}', '${productName} - ${variant.name}', ${variant.our_price}, ${variant.original_price})">
                   Beli Sekarang
               </button>`
            : `<a href="/login" class="btn-buy" style="text-align: center; text-decoration: none;">
                   Login untuk Beli
               </a>`;
        
        return `
            <div class="variant-item">
                <div class="variant-name">${variant.name}</div>
                <div class="variant-details">
                    <span><i class="icon-clock"></i> ${variant.duration}</span>
                    <span><i class="icon-shield"></i> ${variant.warranty}</span>
                    <span><i class="icon-box"></i> Stok: ${variant.stock}</span>
                </div>
                <div class="variant-price-info">
                    <div>
                        <span class="variant-price">${formatRupiah(variant.our_price)}</span>
                        <span class="original-price">${formatRupiah(fakeNormalPrice)}</span>
                    </div>
                    <div class="profit-badge">
                        <span class="badge badge-danger" style="background: rgba(239,68,68,0.1); color: #ef4444;">🔥 ${discountPercent}% OFF</span>
                    </div>
                </div>
                ${buyButton}
            </div>
        `;
    }
};

// Order Functions
const Order = {
    create: async (orderData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify(orderData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Pesanan berhasil dibuat!', 'success');
            }
            
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            showAlert('Gagal membuat pesanan', 'danger');
            throw error;
        }
    },

    getHistory: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/history`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching order history:', error);
            showAlert('Gagal mengambil riwayat pesanan', 'danger');
            throw error;
        }
    },

    openModal: (variantId, productName, ourPrice, originalPrice) => {
        const modal = document.getElementById('orderModal');
        const modalContent = document.getElementById('modalContent');
        
        const profit = ourPrice - originalPrice;
        
        modalContent.innerHTML = `
            <div class="order-summary">
                <h4>Detail Pesanan</h4>
                <table class="order-details">
                    <tr>
                        <td>Produk:</td>
                        <td><strong>${productName}</strong></td>
                    </tr>
                    <tr>
                        <td>Harga Jual:</td>
                        <td><strong class="text-primary">${formatRupiah(ourPrice)}</strong></td>
                    </tr>
                    <tr>
                        <td>Harga Modal:</td>
                        <td><span class="text-muted">${formatRupiah(originalPrice)}</span></td>
                    </tr>
                    <tr>
                        <td>Keuntungan:</td>
                        <td><strong class="text-success">${formatRupiah(profit)}</strong></td>
                    </tr>
                </table>
                
                <form id="orderForm" class="order-form">
                    <div class="form-group">
                        <label class="form-label">Jumlah</label>
                        <input type="number" class="form-input" id="quantity" value="1" min="1" max="10" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Nomor WhatsApp</label>
                        <input type="text" class="form-input" id="whatsappNumber" placeholder="Contoh: 628123456789" value="${currentUser && currentUser.whatsapp ? currentUser.whatsapp : ''}" required>
                        <div class="form-hint">⚠️ Nomor WhatsApp dibutuhkan untuk mengirim data pembelian. Format: 628xxx (tanpa +)</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Kode Voucher (Opsional)</label>
                        <input type="text" class="form-input" id="voucherCode" placeholder="Masukkan kode voucher">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Total Pembayaran</label>
                        <div class="total-price" id="totalPrice">${formatRupiah(ourPrice)}</div>
                    </div>
                    
                    <div id="orderAlert" class="alert" style="display: none;"></div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="Order.closeModal()">Batal</button>
                        <button type="submit" class="btn btn-primary">Buat Pesanan</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Add quantity change handler
        const quantityInput = document.getElementById('quantity');
        const totalPriceDiv = document.getElementById('totalPrice');
        
        quantityInput.addEventListener('input', () => {
            const qty = parseInt(quantityInput.value) || 1;
            totalPriceDiv.textContent = formatRupiah(ourPrice * qty);
        });
        
        // Add form submit handler
        document.getElementById('orderForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const quantity = document.getElementById('quantity').value;
            const whatsappNumber = document.getElementById('whatsappNumber').value;
            const voucherCode = document.getElementById('voucherCode').value;
            const alertDiv = document.getElementById('orderAlert');
            
            // Validate WhatsApp number
            if (!whatsappNumber || whatsappNumber.trim() === '') {
                alertDiv.style.display = 'block';
                alertDiv.className = 'alert alert-danger';
                alertDiv.textContent = 'Nomor WhatsApp wajib diisi!';
                return;
            }
            
            try {
                const response = await Order.create({
                    variant_id: variantId,
                    quantity: parseInt(quantity),
                    buyer_whatsapp: whatsappNumber.trim(),
                    voucher_code: voucherCode
                });
                
                if (response.success) {
                    alertDiv.style.display = 'block';
                    alertDiv.className = 'alert alert-success';
                    alertDiv.textContent = `Pesanan berhasil! ID: ${response.data.order_id}`;
                    
                    // Update balance
                    Balance.update();
                    
                    setTimeout(() => {
                        Order.closeModal();
                        window.location.href = '/orders';
                    }, 2000);
                } else {
                    alertDiv.style.display = 'block';
                    alertDiv.className = 'alert alert-danger';
                    alertDiv.textContent = response.message;
                }
            } catch (error) {
                alertDiv.style.display = 'block';
                alertDiv.className = 'alert alert-danger';
                alertDiv.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
            }
        });
    },

    closeModal: () => {
        const modal = document.getElementById('orderModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    renderOrders: (orders, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Belum ada pesanan</div>';
            return;
        }

        let html = '<table class="table"><thead><tr>';
        html += '<th>Order ID</th>';
        html += '<th>Produk</th>';
        html += '<th>Jumlah</th>';
        html += '<th>Total</th>';
        html += '<th>Keuntungan</th>';
        html += '<th>Status</th>';
        html += '<th>Tanggal</th>';
        html += '</tr></thead><tbody>';

        orders.forEach(order => {
            const statusClass = 
                order.status === 'completed' ? 'badge-success' :
                order.status === 'processing' ? 'badge-warning' :
                'badge-danger';
            
            html += '<tr>';
            html += `<td>${order.order_id}</td>`;
            html += `<td>${order.product_name || 'Unknown'} - ${order.variant_name || 'Unknown'}</td>`;
            html += `<td>${order.quantity}</td>`;
            html += `<td>${formatRupiah(order.our_total)}</td>`;
            html += `<td class="text-success">${formatRupiah(order.profit)}</td>`;
            html += `<td><span class="badge ${statusClass}">${order.status}</span></td>`;
            html += `<td>${new Date(order.created_at).toLocaleString('id-ID')}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }
};

// Balance Functions
const Balance = {
    getUserBalance: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/balance`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    },

    update: async () => {
        try {
            const user = await Auth.getUser();
            const balanceDisplay = document.getElementById('balanceDisplay');
            if (user && balanceDisplay) {
                balanceDisplay.textContent = formatRupiah(user.balance);
            }
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    },

    topup: async (amount) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/topup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ amount })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Top up berhasil!', 'success');
                await Balance.update();
            }
            
            return data;
        } catch (error) {
            console.error('Error during topup:', error);
            showAlert('Gagal melakukan top up', 'danger');
            throw error;
        }
    },

    getProfit: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profit`, {
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching profit:', error);
            throw error;
        }
    }
};

// Initialize the app
const App = {
    Auth,
    Product,
    Order,
    Balance,
    
    init: async () => {
        // Check if user is authenticated on protected pages
        const protectedPages = ['/products', '/orders', '/balance'];
        const currentPath = window.location.pathname;
        
        if (protectedPages.includes(currentPath) && !Auth.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
        
        // Update navbar
        await Auth.updateNavbar();
        
        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', Auth.logout);
        }
    }
};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.App = App;
    window.formatRupiah = formatRupiah;
    window.showAlert = showAlert;
}
            const data = await Balance.getUserBalance();
            if (data.success) {
                const balanceDisplay = document.getElementById('balanceDisplay');
                if (balanceDisplay) {
                    balanceDisplay.textContent = formatRupiah(data.data.balance);
                }
                
                const userBalanceDisplay = document.getElementById('userBalance');
                if (userBalanceDisplay) {
                    userBalanceDisplay.textContent = formatRupiah(data.data.balance);
                }
            }
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    },

    getTotalProfit: async () => {
        try {
            const orders = await Order.getHistory();
            if (orders.success) {
                return orders.data.reduce((sum, order) => sum + parseFloat(order.profit), 0);
            }
            return 0;
        } catch (error) {
            console.error('Error calculating total profit:', error);
            return 0;
        }
    },

    renderProfitHistory: async (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            const orders = await Order.getHistory();
            
            if (!orders.success || orders.data.length === 0) {
                container.innerHTML = '<div class="alert alert-info">Belum ada data keuntungan</div>';
                return;
            }

            let html = '<table class="table"><thead><tr>';
            html += '<th>Order ID</th>';
            html += '<th>Total Order</th>';
            html += '<th>Harga Modal</th>';
            html += '<th>Keuntungan</th>';
            html += '<th>Tanggal</th>';
            html += '</tr></thead><tbody>';

            orders.data.forEach(order => {
                html += '<tr>';
                html += `<td>${order.order_id}</td>`;
                html += `<td>${formatRupiah(order.our_total)}</td>`;
                html += `<td>${formatRupiah(order.original_total)}</td>`;
                html += `<td class="text-success">${formatRupiah(order.profit)}</td>`;
                html += `<td>${new Date(order.created_at).toLocaleString('id-ID')}</td>`;
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;

            // Calculate and display total profit
            const totalProfit = orders.data.reduce((sum, order) => sum + parseFloat(order.profit), 0);
            const totalProfitElement = document.getElementById('totalProfit');
            if (totalProfitElement) {
                totalProfitElement.textContent = formatRupiah(totalProfit);
            }

        } catch (error) {
            console.error('Error rendering profit history:', error);
            container.innerHTML = '<div class="alert alert-danger">Gagal memuat data keuntungan</div>';
        }
    }
};

// UI Functions
const UI = {
    initModals: () => {
        // Close modal when clicking outside
        window.onclick = (event) => {
            const modal = document.getElementById('orderModal');
            if (event.target === modal) {
                Order.closeModal();
            }
        };
    },

    initForms: () => {
        // Add form validation
        const forms = document.querySelectorAll('form[data-validate]');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!UI.validateForm(form)) {
                    e.preventDefault();
                }
            });
        });
    },

    validateForm: (form) => {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
                
                // Add error message
                let errorMsg = input.parentNode.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Field ini wajib diisi';
                    input.parentNode.appendChild(errorMsg);
                }
            } else {
                input.classList.remove('error');
                const errorMsg = input.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
        
        return isValid;
    },

    showLoading: (element) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.add('loading');
            element.setAttribute('disabled', 'disabled');
        }
    },

    hideLoading: (element) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.remove('loading');
            element.removeAttribute('disabled');
        }
    },

    formatDate: (dateString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Update navbar
    await Auth.updateNavbar();
    
    // Initialize UI components
    UI.initModals();
    UI.initForms();
    
    // Add logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});

// Export for use in other scripts
window.App = {
    Auth,
    Product,
    Order,
    Balance,
    UI,
    formatRupiah
};