// Konfigurasi untuk hosting
const CONFIG = {
    // Deteksi environment
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    
    // API URL
    getApiUrl() {
        if (this.isProduction) {
            // Di hosting, gunakan origin yang sama
            return window.location.origin;
        } else {
            // Di local, gunakan localhost:3000
            return 'http://localhost:3000';
        }
    }
};

console.log('Environment:', CONFIG.isProduction ? 'Production' : 'Development');
console.log('API URL:', CONFIG.getApiUrl());