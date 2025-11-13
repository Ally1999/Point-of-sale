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
  create: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key])
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    return api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update: (id, data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key])
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    return api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
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

export default api

