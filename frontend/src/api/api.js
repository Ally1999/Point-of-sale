import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
}

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data)
}

// Sales API
export const salesAPI = {
  getAll: () => api.get('/sales'),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  printThermalReceipt: (saleId, options = {}) => api.post(`/sales/${saleId}/print-thermal-receipt`, options)
}

// Payments API
export const paymentsAPI = {
  getAll: () => api.get('/payments')
}

// Reports API
export const reportsAPI = {
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getSalesByPayment: (params) => api.get('/reports/sales-by-payment', { params }),
  getTopProducts: (params) => api.get('/reports/top-products', { params }),
  getDailySales: (params) => api.get('/reports/daily-sales', { params }),
  getProductSales: (params) => api.get('/reports/product-sales', { params }),
  getVATReport: (params) => api.get('/reports/vat-report', { params }),
  getVATSummary: (params) => api.get('/reports/vat-summary', { params })
}

// System API
export const systemAPI = {
  getBackupStatus: () => api.get('/backup-status')
}

export default api

