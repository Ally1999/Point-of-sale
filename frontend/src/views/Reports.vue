<template>
  <div class="reports-container">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">📊</div>
        <div>
          <h1>Reports & Analytics</h1>
          <p class="header-subtitle">Comprehensive business insights and performance metrics</p>
        </div>
      </div>
    </div>

    <!-- Date Filter -->
    <div class="card filter-section">
      <div class="filter-header">
        <div class="filter-icon">📅</div>
        <h3>Date Range Filter</h3>
      </div>
      <div class="filter-row">
        <div class="form-group">
          <label>Start Date</label>
          <input v-model="filters.startDate" type="date" class="input" />
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input v-model="filters.endDate" type="date" class="input" />
        </div>
        <div class="form-group filter-actions">
          <button @click="applyFilters" class="btn btn-primary">
            <span class="btn-icon">✓</span>
            Apply Filters
          </button>
          <button @click="resetFilters" class="btn btn-secondary">
            <span class="btn-icon">↻</span>
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Report Tabs -->
    <div class="card tabs-card">
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
        >
          <span class="tab-icon">{{ getTabIcon(tab.id) }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- Sales by Payment Method -->
      <div v-if="activeTab === 'payment'" class="tab-content">
        <div class="export-section">
          <button @click="exportSalesByPayment" class="btn btn-primary export-btn" :disabled="salesByPayment.length === 0 || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else>
          <div class="table-wrapper">
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
                  <td class="table-cell-primary">{{ item.PaymentName || 'Unknown' }}</td>
                  <td><span class="badge-count">{{ item.SaleCount }}</span></td>
                  <td class="table-cell-money">Rs {{ formatPrice(item.TotalRevenue) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(item.TotalSubtotal) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(item.TotalVAT) }}</td>
                </tr>
                <tr v-if="salesByPayment.length === 0">
                  <td colspan="5" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div v-if="activeTab === 'products'" class="tab-content">
        <div class="export-section">
          <button @click="exportTopProducts" class="btn btn-primary export-btn" :disabled="topProducts.length === 0 || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else>
          <div class="table-wrapper">
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
                <tr v-for="(product, index) in topProducts" :key="product.ProductName">
                  <td class="table-cell-primary">
                    <span class="rank-badge" v-if="index < 3">{{ index + 1 }}</span>
                    {{ product.ProductName }}
                  </td>
                  <td><span class="badge-count">{{ product.TotalQuantity }}</span></td>
                  <td class="table-cell-money">Rs {{ formatPrice(product.TotalRevenue) }}</td>
                  <td><span class="badge-count">{{ product.SaleCount }}</span></td>
                </tr>
                <tr v-if="topProducts.length === 0">
                  <td colspan="4" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Daily Sales -->
      <div v-if="activeTab === 'daily'" class="tab-content">
        <div class="export-section">
          <button @click="exportDailySales" class="btn btn-primary export-btn" :disabled="dailySales.length === 0 || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else>
          <div class="table-wrapper">
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
                  <td class="table-cell-primary">{{ formatDate(day.SaleDate) }}</td>
                  <td><span class="badge-count">{{ day.SaleCount }}</span></td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalRevenue) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalSubtotal) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalVAT) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalDiscounts) }}</td>
                </tr>
                <tr v-if="dailySales.length === 0">
                  <td colspan="6" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Product Sales Detail -->
      <div v-if="activeTab === 'product-detail'" class="tab-content">
        <div class="export-section">
          <button @click="exportProductSales" class="btn btn-primary export-btn" :disabled="productSales.length === 0 || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else>
          <div class="table-wrapper">
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
                  <td class="table-cell-primary">{{ product.ProductName }}</td>
                  <td><span class="badge-secondary">{{ product.Barcode || '-' }}</span></td>
                  <td><span class="badge-count">{{ product.TotalQuantity }}</span></td>
                  <td class="table-cell-money">Rs {{ formatPrice(product.AvgUnitPrice) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(product.TotalRevenue) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(product.TotalDiscounts) }}</td>
                  <td><span class="badge-count">{{ product.SaleCount }}</span></td>
                </tr>
                <tr v-if="productSales.length === 0">
                  <td colspan="7" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VAT Report -->
      <div v-if="activeTab === 'vat'" class="tab-content">
        <div class="export-section">
          <button @click="exportVATReport" class="btn btn-primary export-btn" :disabled="!vatReport || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
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
          
          <h3 class="section-title">VAT Item Details</h3>
          <div class="table-wrapper scrollable">
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
                  <td colspan="12" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VAT Summary by Date -->
      <div v-if="activeTab === 'vat-summary'" class="tab-content">
        <div class="export-section">
          <button @click="exportVATSummary" class="btn btn-primary export-btn" :disabled="vatSummary.length === 0 || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else>
          <div class="table-wrapper">
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
                  <td class="table-cell-primary">{{ formatDate(day.SaleDate) }}</td>
                  <td><span class="badge-count">{{ day.SaleCount }}</span></td>
                  <td><span class="badge-count">{{ day.VATItemCount }}</span></td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalExpectedVAT) }}</td>
                  <td class="table-cell-money">Rs {{ formatPrice(day.TotalVATCollected) }}</td>
                  <td>
                    <span v-if="day.TotalExcludedVAT > 0" class="excluded-vat-amount">
                      Rs {{ formatPrice(day.TotalExcludedVAT) }}
                    </span>
                    <span v-else>-</span>
                  </td>
                </tr>
                <tr v-if="vatSummary.length === 0">
                  <td colspan="6" class="text-center empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No data available for the selected date range</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Net Sales Summary (Sales - Returns) -->
      <div v-if="activeTab === 'net-sales'" class="tab-content">
        <div class="export-section">
          <button @click="exportNetSalesSummary" class="btn btn-primary export-btn" :disabled="!netSalesSummary || loading">
            <span class="btn-icon">📥</span>
            Export to Excel
          </button>
        </div>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
          <p>Loading report data...</p>
        </div>
        <div v-else-if="netSalesSummary" class="summary-grid">
          <div class="summary-card" style="background: #e3f2fd; border-color: #2196f3;">
            <div class="summary-label">Total Sales</div>
            <div class="summary-value">{{ netSalesSummary.TotalSales || 0 }}</div>
          </div>
          <div class="summary-card" style="background: #fff3e0; border-color: #ff9800;">
            <div class="summary-label">Total Returns</div>
            <div class="summary-value">{{ netSalesSummary.TotalReturns || 0 }}</div>
          </div>
          <div class="summary-card" style="background: #e8f5e9; border-color: #4caf50;">
            <div class="summary-label">Net Revenue</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.NetRevenue) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Sales Revenue</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.TotalRevenue) }}</div>
          </div>
          <div class="summary-card" style="background: #ffebee; border-color: #f44336;">
            <div class="summary-label">Total Refunded</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.TotalRefunded) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Net Subtotal</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.TotalSubtotal) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Net VAT</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.TotalVAT) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Net Discounts</div>
            <div class="summary-value">Rs {{ formatPrice(netSalesSummary.TotalDiscounts) }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { reportsAPI } from '../api/api.js'
import { useToast } from 'vue-toastification'
import * as XLSX from 'xlsx'

export default {
  name: 'Reports',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      activeTab: 'net-sales',
      loading: false,
      filters: {
        startDate: '',
        endDate: ''
      },
      tabs: [
        { id: 'net-sales', label: 'Net Sales (Sales - Returns)' },
        { id: 'payment', label: 'Sales by Payment' },
        { id: 'products', label: 'Top Products' },
        { id: 'daily', label: 'Daily Sales' },
        { id: 'product-detail', label: 'Product Sales Detail' },
        { id: 'vat', label: 'VAT Report' },
        { id: 'vat-summary', label: 'VAT Summary' }
      ],
      netSalesSummary: null,
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
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      this.filters.endDate = tomorrow.toISOString().split('T')[0]
      this.filters.startDate = firstDay.toISOString().split('T')[0]
    },
    async loadReports() {
      this.loading = true
      try {
        const params = {}
        if (this.filters.startDate) params.startDate = this.filters.startDate
        if (this.filters.endDate) params.endDate = this.filters.endDate

        await Promise.all([
          this.loadNetSalesSummary(params),
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
    async loadNetSalesSummary(params) {
      try {
        const response = await reportsAPI.getNetSalesSummary(params)
        this.netSalesSummary = response.data
      } catch (error) {
        console.error('Error loading net sales summary:', error)
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
    },
    exportToExcel(data, filename, sheetName = 'Sheet1') {
      try {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, filename)
        this.toast.success('Excel file downloaded successfully')
      } catch (error) {
        this.toast.error('Failed to export to Excel')
        console.error(error)
      }
    },
    exportSalesByPayment() {
      if (this.salesByPayment.length === 0) return
      
      const data = this.salesByPayment.map(item => ({
        'Payment Method': item.PaymentName || 'Unknown',
        'Sale Count': item.SaleCount,
        'Total Revenue': `Rs ${this.formatPrice(item.TotalRevenue)}`,
        'Subtotal': `Rs ${this.formatPrice(item.TotalSubtotal)}`,
        'VAT': `Rs ${this.formatPrice(item.TotalVAT)}`
      }))
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `Sales_by_Payment_${dateRange}.xlsx`, 'Sales by Payment')
    },
    exportTopProducts() {
      if (this.topProducts.length === 0) return
      
      const data = this.topProducts.map(product => ({
        'Product Name': product.ProductName,
        'Quantity Sold': product.TotalQuantity,
        'Total Revenue': `Rs ${this.formatPrice(product.TotalRevenue)}`,
        'Sale Count': product.SaleCount
      }))
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `Top_Products_${dateRange}.xlsx`, 'Top Products')
    },
    exportDailySales() {
      if (this.dailySales.length === 0) return
      
      const data = this.dailySales.map(day => ({
        'Date': this.formatDate(day.SaleDate),
        'Sale Count': day.SaleCount,
        'Total Revenue': `Rs ${this.formatPrice(day.TotalRevenue)}`,
        'Subtotal': `Rs ${this.formatPrice(day.TotalSubtotal)}`,
        'VAT': `Rs ${this.formatPrice(day.TotalVAT)}`,
        'Discounts': `Rs ${this.formatPrice(day.TotalDiscounts)}`
      }))
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `Daily_Sales_${dateRange}.xlsx`, 'Daily Sales')
    },
    exportProductSales() {
      if (this.productSales.length === 0) return
      
      const data = this.productSales.map(product => ({
        'Product Name': product.ProductName,
        'Barcode': product.Barcode || '-',
        'Quantity Sold': product.TotalQuantity,
        'Avg Unit Price': `Rs ${this.formatPrice(product.AvgUnitPrice)}`,
        'Total Revenue': `Rs ${this.formatPrice(product.TotalRevenue)}`,
        'Total Discounts': `Rs ${this.formatPrice(product.TotalDiscounts)}`,
        'Sale Count': product.SaleCount
      }))
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `Product_Sales_Detail_${dateRange}.xlsx`, 'Product Sales Detail')
    },
    exportVATReport() {
      if (!this.vatReport) return
      
      // Create summary sheet
      const summaryData = [
        { Metric: 'Total VAT Items', Value: this.vatReport.summary.TotalVATItems },
        { Metric: 'Total Expected VAT', Value: `Rs ${this.formatPrice(this.vatReport.summary.TotalExpectedVAT)}` },
        { Metric: 'Total Actual VAT', Value: `Rs ${this.formatPrice(this.vatReport.summary.TotalActualVAT)}` },
        { Metric: 'Total Excluded VAT', Value: `Rs ${this.formatPrice(this.vatReport.summary.TotalExcludedVAT)}` },
        { Metric: 'Items with VAT Excluded', Value: this.vatReport.summary.ItemsWithVATExcluded },
        { Metric: 'Items with VAT Included', Value: this.vatReport.summary.ItemsWithVATIncluded }
      ]
      
      // Create details sheet
      const detailsData = this.vatReport.details.map(item => ({
        'Sale Date': this.formatDate(item.SaleDate),
        'Sale Number': item.SaleNumber,
        'Product Name': item.ProductName,
        'Barcode': item.Barcode || '-',
        'Quantity': item.Quantity,
        'Unit Price': `Rs ${this.formatPrice(item.UnitPrice)}`,
        'Line Total': `Rs ${this.formatPrice(item.LineTotal)}`,
        'VAT Rate': `${item.VATRate}%`,
        'Expected VAT': `Rs ${this.formatPrice(item.ExpectedVAT)}`,
        'Actual VAT': `Rs ${this.formatPrice(item.ActualVAT)}`,
        'Excluded VAT': item.ExcludedVAT > 0 ? `Rs ${this.formatPrice(item.ExcludedVAT)}` : '-',
        'Status': item.IsVATExcluded ? 'Excluded' : 'Included'
      }))
      
      try {
        const wb = XLSX.utils.book_new()
        const ws1 = XLSX.utils.json_to_sheet(summaryData)
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary')
        XLSX.utils.book_append_sheet(wb, ws2, 'Details')
        
        const dateRange = this.getDateRangeString()
        XLSX.writeFile(wb, `VAT_Report_${dateRange}.xlsx`)
        this.toast.success('Excel file downloaded successfully')
      } catch (error) {
        this.toast.error('Failed to export to Excel')
        console.error(error)
      }
    },
    exportVATSummary() {
      if (this.vatSummary.length === 0) return
      
      const data = this.vatSummary.map(day => ({
        'Date': this.formatDate(day.SaleDate),
        'Sale Count': day.SaleCount,
        'VAT Items': day.VATItemCount,
        'Expected VAT': `Rs ${this.formatPrice(day.TotalExpectedVAT)}`,
        'Actual VAT Collected': `Rs ${this.formatPrice(day.TotalVATCollected)}`,
        'Excluded VAT': day.TotalExcludedVAT > 0 ? `Rs ${this.formatPrice(day.TotalExcludedVAT)}` : '-'
      }))
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `VAT_Summary_${dateRange}.xlsx`, 'VAT Summary')
    },
    getDateRangeString() {
      const start = this.filters.startDate ? this.filters.startDate.replace(/-/g, '') : 'all'
      const end = this.filters.endDate ? this.filters.endDate.replace(/-/g, '') : 'all'
      return `${start}_to_${end}`
    },
    getTabIcon(tabId) {
      const icons = {
        'net-sales': '💰',
        'payment': '💳',
        'products': '🏆',
        'daily': '📈',
        'product-detail': '📦',
        'vat': '🧾',
        'vat-summary': '📊'
      }
      return icons[tabId] || '📋'
    },
    exportNetSalesSummary() {
      if (!this.netSalesSummary) return
      
      const data = [
        { Metric: 'Total Sales', Value: this.netSalesSummary.TotalSales || 0 },
        { Metric: 'Total Returns', Value: this.netSalesSummary.TotalReturns || 0 },
        { Metric: 'Total Sales Revenue', Value: `Rs ${this.formatPrice(this.netSalesSummary.TotalRevenue)}` },
        { Metric: 'Total Refunded', Value: `Rs ${this.formatPrice(this.netSalesSummary.TotalRefunded)}` },
        { Metric: 'Net Revenue', Value: `Rs ${this.formatPrice(this.netSalesSummary.NetRevenue)}` },
        { Metric: 'Net Subtotal', Value: `Rs ${this.formatPrice(this.netSalesSummary.TotalSubtotal)}` },
        { Metric: 'Net VAT', Value: `Rs ${this.formatPrice(this.netSalesSummary.TotalVAT)}` },
        { Metric: 'Net Discounts', Value: `Rs ${this.formatPrice(this.netSalesSummary.TotalDiscounts)}` }
      ]
      
      const dateRange = this.getDateRangeString()
      this.exportToExcel(data, `Net_Sales_Summary_${dateRange}.xlsx`, 'Net Sales Summary')
    },
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
  padding-bottom: 48px;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 28px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  font-size: 48px;
  line-height: 1;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.header-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  color: white;
}

/* Filter Section */
.filter-section {
  margin-bottom: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.filter-icon {
  font-size: 24px;
}

.filter-section h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-row .form-group {
  flex: 1;
  min-width: 180px;
}

.filter-actions {
  display: flex;
  gap: 12px;
  flex: 0 0 auto;
}

.btn-icon {
  margin-right: 6px;
  font-size: 16px;
}

/* Tabs */
.tabs-card {
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding: 0 8px;
  background: #fafafa;
}

.tab-button {
  padding: 14px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px 8px 0 0;
  margin-bottom: -2px;
  position: relative;
}

.tab-button:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
  background: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  white-space: nowrap;
}

.tab-content {
  min-height: 300px;
  padding: 0 8px;
}

/* Export Section */
.export-section {
  margin-bottom: 24px;
  display: flex;
  justify-content: flex-end;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
}

/* Loading */
.loading {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  margin: 0;
  font-size: 16px;
  color: #64748b;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.summary-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  border: 2px solid #e9ecef;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.summary-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

/* Tables */
.table-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.table-wrapper.scrollable {
  max-height: 500px;
  overflow-y: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  color: #475569;
}

.table tbody tr {
  transition: all 0.2s ease;
}

.table tbody tr:hover {
  background: #f8fafc;
  transform: scale(1.01);
}

.table-cell-primary {
  font-weight: 600;
  color: #1e293b;
}

.table-cell-money {
  font-weight: 600;
  color: #059669;
  font-family: 'Courier New', monospace;
}

/* Badges */
.badge-count {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
}

.badge-secondary {
  display: inline-block;
  background: #e2e8f0;
  color: #475569;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 24px;
  font-weight: 700;
  font-size: 12px;
  margin-right: 8px;
  vertical-align: middle;
}

.vat-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.vat-excluded-badge {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.excluded-vat-amount {
  color: #dc2626;
  font-weight: 700;
  font-size: 14px;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: #94a3b8;
  font-size: 16px;
  margin: 0;
}

/* Section Title */
.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 32px 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e9ecef;
}

.text-center {
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 24px;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .header-icon {
    font-size: 40px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .filter-row {
    flex-direction: column;
  }
  
  .filter-row .form-group {
    width: 100%;
  }

  .filter-actions {
    width: 100%;
    flex-direction: column;
  }

  .filter-actions .btn {
    width: 100%;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-button {
    white-space: nowrap;
    padding: 12px 16px;
  }
  
  .table-wrapper {
    overflow-x: auto;
  }

  .table {
    font-size: 12px;
    min-width: 600px;
  }
  
  .table th,
  .table td {
    padding: 10px 12px;
  }
}
</style>

