<template>
  <div class="reports-container">
    <div class="page-header">
      <h1>Reports</h1>
    </div>

    <!-- Date Filter -->
    <div class="card filter-section">
      <h3>Date Range</h3>
      <div class="filter-row">
        <div class="form-group">
          <label>Start Date</label>
          <input v-model="filters.startDate" type="date" class="input" />
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input v-model="filters.endDate" type="date" class="input" />
        </div>
        <div class="form-group">
          <button @click="applyFilters" class="btn btn-primary">Apply Filters</button>
          <button @click="resetFilters" class="btn btn-secondary">Reset</button>
        </div>
      </div>
    </div>

    <!-- Report Tabs -->
    <div class="card">
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Sales Summary -->
      <div v-if="activeTab === 'summary'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="salesSummary" class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Sales</div>
            <div class="summary-value">{{ salesSummary.TotalSales || 0 }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">Rs {{ formatPrice(salesSummary.TotalRevenue) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Subtotal</div>
            <div class="summary-value">Rs {{ formatPrice(salesSummary.TotalSubtotal) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total VAT</div>
            <div class="summary-value">Rs {{ formatPrice(salesSummary.TotalVAT) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Discounts</div>
            <div class="summary-value">Rs {{ formatPrice(salesSummary.TotalDiscounts) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Amount Paid</div>
            <div class="summary-value">Rs {{ formatPrice(salesSummary.TotalAmountPaid) }}</div>
          </div>
        </div>
      </div>

      <!-- Sales by Payment Method -->
      <div v-if="activeTab === 'payment'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Sale Count</th>
                <th>Total Revenue</th>
                <th>Subtotal</th>
                <th>VAT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in salesByPayment" :key="item.PaymentName">
                <td>{{ item.PaymentName || 'Unknown' }}</td>
                <td>{{ item.SaleCount }}</td>
                <td>Rs {{ formatPrice(item.TotalRevenue) }}</td>
                <td>Rs {{ formatPrice(item.TotalSubtotal) }}</td>
                <td>Rs {{ formatPrice(item.TotalVAT) }}</td>
              </tr>
              <tr v-if="salesByPayment.length === 0">
                <td colspan="5" class="text-center">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Products -->
      <div v-if="activeTab === 'products'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity Sold</th>
                <th>Total Revenue</th>
                <th>Sale Count</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in topProducts" :key="product.ProductName">
                <td>{{ product.ProductName }}</td>
                <td>{{ product.TotalQuantity }}</td>
                <td>Rs {{ formatPrice(product.TotalRevenue) }}</td>
                <td>{{ product.SaleCount }}</td>
              </tr>
              <tr v-if="topProducts.length === 0">
                <td colspan="4" class="text-center">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daily Sales -->
      <div v-if="activeTab === 'daily'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sale Count</th>
                <th>Total Revenue</th>
                <th>Subtotal</th>
                <th>VAT</th>
                <th>Discounts</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in dailySales" :key="day.SaleDate">
                <td>{{ formatDate(day.SaleDate) }}</td>
                <td>{{ day.SaleCount }}</td>
                <td>Rs {{ formatPrice(day.TotalRevenue) }}</td>
                <td>Rs {{ formatPrice(day.TotalSubtotal) }}</td>
                <td>Rs {{ formatPrice(day.TotalVAT) }}</td>
                <td>Rs {{ formatPrice(day.TotalDiscounts) }}</td>
              </tr>
              <tr v-if="dailySales.length === 0">
                <td colspan="6" class="text-center">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Product Sales Detail -->
      <div v-if="activeTab === 'product-detail'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode</th>
                <th>Quantity Sold</th>
                <th>Avg Unit Price</th>
                <th>Total Revenue</th>
                <th>Total Discounts</th>
                <th>Sale Count</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in productSales" :key="product.ProductName">
                <td>{{ product.ProductName }}</td>
                <td>{{ product.Barcode || '-' }}</td>
                <td>{{ product.TotalQuantity }}</td>
                <td>Rs {{ formatPrice(product.AvgUnitPrice) }}</td>
                <td>Rs {{ formatPrice(product.TotalRevenue) }}</td>
                <td>Rs {{ formatPrice(product.TotalDiscounts) }}</td>
                <td>{{ product.SaleCount }}</td>
              </tr>
              <tr v-if="productSales.length === 0">
                <td colspan="7" class="text-center">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VAT Report -->
      <div v-if="activeTab === 'vat'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="vatReport">
          <div class="summary-grid" style="margin-bottom: 30px;">
            <div class="summary-card">
              <div class="summary-label">Total VAT Items</div>
              <div class="summary-value">{{ vatReport.summary.TotalVATItems }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Expected VAT</div>
              <div class="summary-value">Rs {{ formatPrice(vatReport.summary.TotalExpectedVAT) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Actual VAT</div>
              <div class="summary-value">Rs {{ formatPrice(vatReport.summary.TotalActualVAT) }}</div>
            </div>
            <div class="summary-card" style="background: #fff3cd; border-color: #ffc107;">
              <div class="summary-label">Total Excluded VAT</div>
              <div class="summary-value" style="color: #856404;">Rs {{ formatPrice(vatReport.summary.TotalExcludedVAT) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Items with VAT Excluded</div>
              <div class="summary-value">{{ vatReport.summary.ItemsWithVATExcluded }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Items with VAT Included</div>
              <div class="summary-value">{{ vatReport.summary.ItemsWithVATIncluded }}</div>
            </div>
          </div>
          
          <h3 style="margin-bottom: 15px;">VAT Item Details</h3>
          <div style="max-height: 500px; overflow-y: auto;">
            <table class="table">
              <thead>
                <tr>
                  <th>Sale Date</th>
                  <th>Sale Number</th>
                  <th>Product Name</th>
                  <th>Barcode</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                  <th>VAT Rate</th>
                  <th>Expected VAT</th>
                  <th>Actual VAT</th>
                  <th>Excluded VAT</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in vatReport.details" :key="item.SaleItemID">
                  <td>{{ formatDate(item.SaleDate) }}</td>
                  <td>{{ item.SaleNumber }}</td>
                  <td>{{ item.ProductName }}</td>
                  <td>{{ item.Barcode || '-' }}</td>
                  <td>{{ item.Quantity }}</td>
                  <td>Rs {{ formatPrice(item.UnitPrice) }}</td>
                  <td>Rs {{ formatPrice(item.LineTotal) }}</td>
                  <td>{{ item.VATRate }}%</td>
                  <td>Rs {{ formatPrice(item.ExpectedVAT) }}</td>
                  <td>Rs {{ formatPrice(item.ActualVAT) }}</td>
                  <td>
                    <span v-if="item.ExcludedVAT > 0" style="color: #dc3545; font-weight: 600;">
                      Rs {{ formatPrice(item.ExcludedVAT) }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>
                    <span v-if="item.IsVATExcluded" class="vat-excluded-badge">Excluded</span>
                    <span v-else class="vat-badge">Included</span>
                  </td>
                </tr>
                <tr v-if="vatReport.details.length === 0">
                  <td colspan="12" class="text-center">No data available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VAT Summary by Date -->
      <div v-if="activeTab === 'vat-summary'" class="tab-content">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sale Count</th>
                <th>VAT Items</th>
                <th>Expected VAT</th>
                <th>Actual VAT Collected</th>
                <th>Excluded VAT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in vatSummary" :key="day.SaleDate">
                <td>{{ formatDate(day.SaleDate) }}</td>
                <td>{{ day.SaleCount }}</td>
                <td>{{ day.VATItemCount }}</td>
                <td>Rs {{ formatPrice(day.TotalExpectedVAT) }}</td>
                <td>Rs {{ formatPrice(day.TotalVATCollected) }}</td>
                <td>
                  <span v-if="day.TotalExcludedVAT > 0" style="color: #dc3545; font-weight: 600;">
                    Rs {{ formatPrice(day.TotalExcludedVAT) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr v-if="vatSummary.length === 0">
                <td colspan="6" class="text-center">No data available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { reportsAPI } from '../api/api.js'
import { useToast } from 'vue-toastification'

export default {
  name: 'Reports',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      activeTab: 'summary',
      loading: false,
      filters: {
        startDate: '',
        endDate: ''
      },
      tabs: [
        { id: 'summary', label: 'Sales Summary' },
        { id: 'payment', label: 'Sales by Payment' },
        { id: 'products', label: 'Top Products' },
        { id: 'daily', label: 'Daily Sales' },
        { id: 'product-detail', label: 'Product Sales Detail' },
        { id: 'vat', label: 'VAT Report' },
        { id: 'vat-summary', label: 'VAT Summary' }
      ],
      salesSummary: null,
      salesByPayment: [],
      topProducts: [],
      dailySales: [],
      productSales: [],
      vatReport: null,
      vatSummary: []
    }
  },
  mounted() {
    this.setDefaultDates()
    this.loadReports()
  },
  methods: {
    setDefaultDates() {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      this.filters.endDate = today.toISOString().split('T')[0]
      this.filters.startDate = firstDay.toISOString().split('T')[0]
    },
    async loadReports() {
      this.loading = true
      try {
        const params = {}
        if (this.filters.startDate) params.startDate = this.filters.startDate
        if (this.filters.endDate) params.endDate = this.filters.endDate

        await Promise.all([
          this.loadSalesSummary(params),
          this.loadSalesByPayment(params),
          this.loadTopProducts(params),
          this.loadDailySales(params),
          this.loadProductSales(params),
          this.loadVATReport(params),
          this.loadVATSummary(params)
        ])
      } catch (error) {
        this.toast.error('Failed to load reports')
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    async loadSalesSummary(params) {
      try {
        const response = await reportsAPI.getSalesSummary(params)
        this.salesSummary = response.data
      } catch (error) {
        console.error('Error loading sales summary:', error)
      }
    },
    async loadSalesByPayment(params) {
      try {
        const response = await reportsAPI.getSalesByPayment(params)
        this.salesByPayment = response.data
      } catch (error) {
        console.error('Error loading sales by payment:', error)
      }
    },
    async loadTopProducts(params) {
      try {
        const response = await reportsAPI.getTopProducts({ ...params, limit: 20 })
        this.topProducts = response.data
      } catch (error) {
        console.error('Error loading top products:', error)
      }
    },
    async loadDailySales(params) {
      try {
        const response = await reportsAPI.getDailySales(params)
        this.dailySales = response.data
      } catch (error) {
        console.error('Error loading daily sales:', error)
      }
    },
    async loadProductSales(params) {
      try {
        const response = await reportsAPI.getProductSales(params)
        this.productSales = response.data
      } catch (error) {
        console.error('Error loading product sales:', error)
      }
    },
    async loadVATReport(params) {
      try {
        const response = await reportsAPI.getVATReport(params)
        this.vatReport = response.data
      } catch (error) {
        console.error('Error loading VAT report:', error)
      }
    },
    async loadVATSummary(params) {
      try {
        const response = await reportsAPI.getVATSummary(params)
        this.vatSummary = response.data
      } catch (error) {
        console.error('Error loading VAT summary:', error)
      }
    },
    applyFilters() {
      this.loadReports()
    },
    resetFilters() {
      this.setDefaultDates()
      this.loadReports()
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2)
    },
    formatDate(date) {
      if (!date) return ''
      try {
        return new Date(date).toLocaleDateString()
      } catch (e) {
        return date
      }
    }
  },
  watch: {
    activeTab() {
      // Optionally reload data when switching tabs
    }
  }
}
</script>

<style scoped>
.reports-container {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.filter-row {
  display: flex;
  gap: 15px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-row .form-group {
  flex: 1;
  min-width: 150px;
}

.filter-row .form-group:last-child {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}

.tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #eee;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-button {
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-button:hover {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.tab-content {
  min-height: 200px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.summary-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.summary-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.table tbody tr:hover {
  background: #f8f9fa;
}

.text-center {
  text-align: center;
}

.vat-badge {
  background: #ffc107;
  color: #333;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.vat-excluded-badge {
  background: #6c757d;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
  }
  
  .filter-row .form-group {
    width: 100%;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .table {
    font-size: 12px;
  }
  
  .table th,
  .table td {
    padding: 8px;
  }
}
</style>

