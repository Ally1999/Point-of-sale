<template>
  <div class="sales-container">
    <div class="page-header">
      <h1>Sales History</h1>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Sale Number</th>
            <th>Date</th>
            <th>Items</th>
            <th>Subtotal</th>
            <th>VAT</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sale in sales" :key="sale.SaleID">
            <td>{{ sale.SaleNumber }}</td>
            <td>{{ formatDate(sale.SaleDate) }}</td>
            <td>{{ sale.itemCount || '-' }}</td>
            <td>Rs {{ formatPrice(sale.SubTotal) }}</td>
            <td>Rs {{ formatPrice(sale.VATAmount) }}</td>
            <td>Rs {{ formatPrice(sale.TotalAmount) }}</td>
            <td>{{ sale.PaymentName }}</td>
            <td>
              <button @click="viewReceipt(sale.SaleID)" class="btn btn-primary">View Receipt</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceipt" class="modal" @click.self="closeReceipt">
      <div class="modal-content receipt" id="receipt">
        <div class="receipt-header">
          <h2>Receipt</h2>
          <p>{{ receiptData.SaleNumber }}</p>
          <p>{{ formatDate(receiptData.SaleDate) }}</p>
        </div>
        <div class="receipt-items">
          <div v-for="item in receiptData.items" :key="item.SaleItemID" class="receipt-item">
            <div class="receipt-item-name">{{ item.ProductName }}</div>
            <div class="receipt-item-details">
              {{ item.Quantity }} × Rs {{ formatPrice(item.UnitPrice) }}
              <span v-if="item.DiscountAmount > 0" class="discount-text">
                (Discount: -Rs {{ formatPrice(item.DiscountAmount) }})
              </span>
              = Rs {{ formatPrice(item.LineTotal) }}
              <span v-if="item.IsVAT" class="vat-badge">VAT {{ item.VATRate }}%</span>
            </div>
          </div>
        </div>
        <div class="receipt-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>Rs {{ formatPrice(receiptData.SubTotal) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.DiscountAmount > 0">
            <span>Sale Discount:</span>
            <span class="discount-text">-Rs {{ formatPrice(receiptData.DiscountAmount) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.VATAmount > 0">
            <span>VAT:</span>
            <span>Rs {{ formatPrice(receiptData.VATAmount) }}</span>
          </div>
          <div class="summary-row total">
            <span>Total:</span>
            <span>Rs {{ formatPrice(receiptData.TotalAmount) }}</span>
          </div>
          <div class="summary-row">
            <span>Payment:</span>
            <span>{{ receiptData.PaymentName }}</span>
          </div>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your purchase!</p>
        </div>
        <div class="receipt-actions">
          <button @click="closeReceipt" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { salesAPI } from '../api/api.js'
import { useToast } from 'vue-toastification'

export default {
  name: 'Sales',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      sales: [],
      showReceipt: false,
      receiptData: null
    }
  },
  mounted() {
    this.loadSales()
  },
  methods: {
    async loadSales() {
      try {
        const response = await salesAPI.getAll()
        this.sales = response.data.map(sale => ({
          ...sale,
          itemCount: '-' // Will be populated if needed
        }))
      } catch (error) {
        this.toast.error('Failed to load sales')
        console.error(error)
      }
    },
    async viewReceipt(id) {
      try {
        const response = await salesAPI.getById(id)
        this.receiptData = response.data
        this.showReceipt = true
      } catch (error) {
        this.toast.error('Failed to load receipt')
        console.error(error)
      }
    },
    closeReceipt() {
      this.showReceipt = false
      this.receiptData = null
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2)
    },
    formatDate(date) {
      if (!date) return ''
      try {
        return new Date(date).toLocaleString()
      } catch (e) {
        return date
      }
    }
  }
}
</script>

<style scoped>
.receipt {
  max-width: 400px;
  padding: 30px;
}

.receipt-header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px dashed #ddd;
  padding-bottom: 15px;
}

.receipt-header h2 {
  margin-bottom: 10px;
}

.receipt-header p {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}

.receipt-items {
  margin-bottom: 20px;
}

.receipt-item {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.receipt-item-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.receipt-item-details {
  font-size: 14px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vat-badge {
  background: #ffc107;
  color: #333;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.discount-text {
  color: #dc3545;
  font-weight: 600;
}

.receipt-summary {
  border-top: 2px solid #ddd;
  padding-top: 15px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.summary-row.total {
  font-size: 18px;
  font-weight: 600;
  border-top: 2px solid #eee;
  padding-top: 10px;
  margin-top: 10px;
}

.receipt-footer {
  text-align: center;
  padding-top: 15px;
  border-top: 2px dashed #ddd;
  color: #666;
}

.receipt-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.receipt-actions .btn {
  flex: 1;
}

@media print {
  /* Style receipt for 57mm thermal printer */
  .modal-content.receipt {
    width: 57mm !important;
    max-width: 57mm !important;
    padding: 5mm 3mm !important;
    font-size: 10pt !important;
    line-height: 1.2 !important;
  }
  
  .receipt-header {
    text-align: center !important;
    margin-bottom: 8px !important;
    padding-bottom: 8px !important;
    border-bottom: 1px dashed #000 !important;
  }
  
  .receipt-header h2 {
    font-size: 14pt !important;
    font-weight: bold !important;
    margin: 0 0 4px 0 !important;
  }
  
  .receipt-header p {
    font-size: 9pt !important;
    margin: 2px 0 !important;
  }
  
  .receipt-items {
    margin-bottom: 8px !important;
  }
  
  .receipt-item {
    padding: 4px 0 !important;
    border-bottom: 1px dotted #ccc !important;
    font-size: 9pt !important;
  }
  
  .receipt-item-name {
    font-weight: 600 !important;
    margin-bottom: 2px !important;
    font-size: 9pt !important;
  }
  
  .receipt-item-details {
    font-size: 8pt !important;
    color: #333 !important;
    line-height: 1.3 !important;
  }
  
  .receipt-summary {
    border-top: 1px dashed #000 !important;
    padding-top: 8px !important;
    margin-bottom: 8px !important;
    font-size: 9pt !important;
  }
  
  .receipt-summary .summary-row {
    padding: 3px 0 !important;
    font-size: 9pt !important;
  }
  
  .receipt-summary .summary-row.total {
    font-size: 11pt !important;
    font-weight: bold !important;
    border-top: 1px dashed #000 !important;
    padding-top: 6px !important;
    margin-top: 6px !important;
  }
  
  .receipt-footer {
    text-align: center !important;
    padding-top: 8px !important;
    border-top: 1px dashed #000 !important;
    font-size: 9pt !important;
    margin-top: 8px !important;
  }
  
  .receipt-footer p {
    margin: 4px 0 !important;
  }
  
  .vat-badge,
  .discount-text {
    font-size: 7pt !important;
    padding: 1px 3px !important;
  }
  
  .receipt-actions {
    display: none !important;
  }
  
  .receipt {
    page-break-inside: avoid !important;
    page-break-after: avoid !important;
    page-break-before: avoid !important;
  }
  
  .receipt-item {
    page-break-inside: avoid !important;
  }
  
  @page {
    margin: 0 !important;
    size: 57mm auto !important;
  }
}
</style>

