<template>
  <div class="pos-container">
    <div class="pos-layout">
      <!-- Product Search/Scan Section -->
      <div class="pos-left">
        <div class="card">
          <h2>Scan/Add Product</h2>
          <div class="form-group">
            <input
              v-model="barcodeInput"
              @keyup.enter="scanBarcode"
              type="text"
              class="input"
              placeholder="Scan barcode or enter product code"
              ref="barcodeInputRef"
            />
          </div>
          <div class="product-list">
            <div
              v-for="product in filteredProducts"
              :key="product.ProductID"
              class="product-item"
              @click="addToCart(product)"
            >
              <img
                v-if="product.ImageBase64"
                :src="product.ImageBase64"
                :alt="product.ProductName"
                class="product-image-small"
              />
              <span v-else class="no-image">No Image</span>
              <div class="product-info">
                <div class="product-name">{{ product.ProductName }}</div>
                <div class="product-price">Rs {{ formatPrice(product.Price) }}</div>
                <div class="product-barcode" v-if="product.Barcode">{{ product.Barcode }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Section -->
      <div class="pos-right">
        <div class="card">
          <h2>Cart</h2>
          <div class="cart-items">
            <div v-if="cart.length === 0" class="empty-cart">Cart is empty</div>
            <div
              v-for="(item, index) in cart"
              :key="index"
              class="cart-item"
            >
              <div class="cart-item-info">
                <div class="cart-item-name">{{ item.productName }}</div>
                <div class="cart-item-details">
                  <span>Rs {{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</span>
                  <span v-if="item.isVAT && !item.excludeVAT" class="vat-badge">VAT {{ item.vatRate }}%</span>
                  <span v-if="item.isVAT && item.excludeVAT" class="vat-excluded-badge">VAT Excluded</span>
                  <span v-if="item.discountAmount > 0" class="discount-badge">
                    Discount: Rs {{ formatPrice(item.discountAmount) }}
                  </span>
                </div>
                <div class="cart-item-line-total">
                  Line Total: Rs {{ formatPrice(getItemLineTotal(item)) }}
                </div>
                <div class="cart-item-options" v-if="item.isVAT">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      v-model="item.excludeVAT"
                      @change="updateVATExclusion(index)"
                    />
                    Exclude VAT
                  </label>
                </div>
                <div class="cart-item-discount" v-if="!item.showDiscount">
                  <button @click="showItemDiscount(index)" class="btn-link">Add Discount</button>
                </div>
                <div class="cart-item-discount-form" v-else>
                  <div class="form-row-small">
                    <input
                      v-model.number="item.discountValue"
                      type="number"
                      step="0.01"
                      min="0"
                      class="input-small"
                      placeholder="Discount amount (Rs)"
                      @input="calculateItemDiscount(index)"
                    />
                    <button @click="hideItemDiscount(index)" class="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
              <div class="cart-item-actions">
                <button @click="decreaseQuantity(index)" class="btn btn-secondary">-</button>
                <span class="quantity">{{ item.quantity }}</span>
                <button @click="increaseQuantity(index)" class="btn btn-secondary">+</button>
                <button @click="removeFromCart(index)" class="btn btn-danger">×</button>
              </div>
            </div>
          </div>

          <div class="cart-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>Rs {{ formatPrice(originalSubtotal) }}</span>
            </div>
            <div class="summary-row" v-if="totalItemDiscounts > 0">
              <span>Item Discounts:</span>
              <span class="discount-text">-Rs {{ formatPrice(totalItemDiscounts) }}</span>
            </div>
            <div class="summary-row" v-if="saleDiscountAmount > 0">
              <span>Sale Discount:</span>
              <span class="discount-text">-Rs {{ formatPrice(saleDiscountAmount) }}</span>
            </div>
            <div class="summary-row">
              <span>Subtotal After Discount:</span>
              <span>Rs {{ formatPrice(subtotal) }}</span>
            </div>
            <div class="summary-row" v-if="vatAmount > 0">
              <span>VAT:</span>
              <span>Rs {{ formatPrice(vatAmount) }}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>Rs {{ formatPrice(totalAmount) }}</span>
            </div>
          </div>

          <div class="discount-section">
            <div class="form-group">
              <label>Sale Discount (Amount)</label>
              <input
                v-model.number="saleDiscountValue"
                type="number"
                step="0.01"
                min="0"
                class="input"
                placeholder="Enter discount amount"
              />
            </div>
          </div>

          <div class="payment-section">
            <div class="form-group">
              <label>Payment Type</label>
              <select v-model="selectedPaymentType" class="input">
                <option v-for="payment in paymentTypes" :key="payment.PaymentTypeID" :value="payment.PaymentTypeID">
                  {{ payment.PaymentName }}
                </option>
              </select>
            </div>
          </div>

          <div class="cart-actions">
            <button @click="clearCart" class="btn btn-secondary">Clear</button>
            <button @click="processSale" :disabled="cart.length === 0 || !selectedPaymentType" class="btn btn-success">
              Process Sale
            </button>
          </div>
        </div>
      </div>
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
              <span v-if="item.IsVAT && !item.ExcludeVAT" class="vat-badge">VAT {{ item.VATRate }}%</span>
              <span v-if="item.IsVAT && item.ExcludeVAT" class="vat-excluded-badge">VAT Excluded</span>
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
          <button @click="printThermalReceipt" class="btn btn-primary">Print Receipt</button>
          <button @click="closeReceipt" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { productsAPI, salesAPI, paymentsAPI } from '../api/api.js'
import { useToast } from 'vue-toastification'

export default {
  name: 'POS',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      products: [],
      filteredProducts: [],
      cart: [],
      paymentTypes: [],
      selectedPaymentType: null,
      barcodeInput: '',
      showReceipt: false,
      receiptData: null,
      saleDiscountValue: 0
    }
  },
  computed: {
    originalSubtotal() {
      return this.cart.reduce((sum, item) => {
        const lineTotal = item.unitPrice * item.quantity
        return sum + lineTotal
      }, 0)
    },
    totalItemDiscounts() {
      return this.cart.reduce((sum, item) => {
        return sum + (item.discountAmount || 0)
      }, 0)
    },
    subtotal() {
      // Calculate VAT-inclusive total after item discounts (before sale discount)
      const vatInclusiveBeforeSaleDiscount = this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0)
      
      // Calculate base total (VAT-exclusive) by extracting VAT from each item
      let baseTotal = 0
      for (const item of this.cart) {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        
        // Apply proportional sale discount
        if (vatInclusiveBeforeSaleDiscount > 0 && this.saleDiscountAmount > 0) {
          const itemProportion = lineTotal / vatInclusiveBeforeSaleDiscount
          lineTotal -= this.saleDiscountAmount * itemProportion
        }
        
        // Extract base price if VAT is included in the price (and not excluded)
        if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
          const vatMultiplier = 1 + (item.vatRate / 100)
          lineTotal = lineTotal / vatMultiplier
        }
        
        baseTotal += lineTotal
      }
      
      return baseTotal
    },
    saleDiscountAmount() {
      const baseSubtotal = this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0)
      
      const discountValue = Number(this.saleDiscountValue) || 0
      if (discountValue <= 0) {
        return 0
      }
      
      return Math.min(discountValue, baseSubtotal)
    },
    vatAmount() {
      // Calculate VAT-inclusive total after item discounts (before sale discount)
      const vatInclusiveBeforeSaleDiscount = this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0)
      
      // Extract VAT from each item after applying sale discount proportionally
      let totalVAT = 0
      for (const item of this.cart) {
        if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
          let lineTotal = item.unitPrice * item.quantity
          if (item.discountAmount) {
            lineTotal -= item.discountAmount
          }
          
          // Apply proportional sale discount
          if (vatInclusiveBeforeSaleDiscount > 0 && this.saleDiscountAmount > 0) {
            const itemProportion = lineTotal / vatInclusiveBeforeSaleDiscount
            lineTotal -= this.saleDiscountAmount * itemProportion
          }
          
          // Extract VAT from VAT-inclusive price
          const vatMultiplier = 1 + (item.vatRate / 100)
          const basePrice = lineTotal / vatMultiplier
          const vat = lineTotal - basePrice
          totalVAT += vat
        }
      }
      
      return totalVAT
    },
    totalAmount() {
      // Total is the sum of all VAT-inclusive prices (after discounts)
      return this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0) - this.saleDiscountAmount
    }
  },
  mounted() {
    this.loadProducts()
    this.loadPaymentTypes()
    this.$refs.barcodeInputRef?.focus()
  },
  methods: {
    async loadProducts() {
      try {
        const response = await productsAPI.getAll()
        this.products = response.data
        this.filteredProducts = response.data
      } catch (error) {
        this.toast.error('Failed to load products')
        console.error(error)
      }
    },
    async loadPaymentTypes() {
      try {
        const response = await paymentsAPI.getAll()
        this.paymentTypes = response.data
        if (this.paymentTypes.length > 0) {
          this.selectedPaymentType = this.paymentTypes[0].PaymentTypeID
        }
      } catch (error) {
        this.toast.error('Failed to load payment types')
        console.error(error)
      }
    },
    async scanBarcode() {
      if (!this.barcodeInput.trim()) return
      
      try {
        const response = await productsAPI.getByBarcode(this.barcodeInput.trim())
        this.addToCart(response.data)
        this.barcodeInput = ''
        this.$refs.barcodeInputRef?.focus()
      } catch (error) {
        this.toast.error('Product not found')
        this.barcodeInput = ''
      }
    },
    addToCart(product) {
      const existingIndex = this.cart.findIndex(item => item.productID === product.ProductID)
      
      if (existingIndex >= 0) {
        this.cart[existingIndex].quantity++
      } else {
        this.cart.push({
          productID: product.ProductID,
          productName: product.ProductName,
          barcode: product.Barcode,
          unitPrice: parseFloat(product.Price),
          quantity: 1,
          isVAT: product.IsVAT === true || product.IsVAT === 1,
          vatRate: parseFloat(product.VATRate || 0),
          excludeVAT: false,
          discountValue: 0,
          discountAmount: 0,
          showDiscount: false
        })
      }
      
      this.barcodeInput = ''
      this.$refs.barcodeInputRef?.focus()
    },
    showItemDiscount(index) {
      this.cart[index].showDiscount = true
    },
    hideItemDiscount(index) {
      this.cart[index].showDiscount = false
      this.cart[index].discountValue = 0
      this.cart[index].discountAmount = 0
    },
    updateVATExclusion(index) {
      // VAT exclusion is handled automatically by computed properties
    },
    calculateItemDiscount(index) {
      const item = this.cart[index]
      const discountValue = Number(item.discountValue) || 0
      if (discountValue <= 0) {
        item.discountAmount = 0
        return
      }
      
      const lineTotal = item.unitPrice * item.quantity
      item.discountAmount = Math.min(discountValue, lineTotal)
      item.discountValue = Math.min(discountValue, lineTotal)
    },
    getItemLineTotal(item) {
      // Line total is the VAT-inclusive price (after discounts)
      let lineTotal = item.unitPrice * item.quantity
      if (item.discountAmount) {
        lineTotal -= item.discountAmount
      }
      return lineTotal
    },
    increaseQuantity(index) {
      this.cart[index].quantity++
    },
    decreaseQuantity(index) {
      if (this.cart[index].quantity > 1) {
        this.cart[index].quantity--
      } else {
        this.removeFromCart(index)
      }
    },
    removeFromCart(index) {
      this.cart.splice(index, 1)
    },
    clearCart() {
      this.cart = []
      this.saleDiscountValue = 0
    },
    async processSale() {
      if (this.cart.length === 0 || !this.selectedPaymentType) {
        this.toast.error('Please complete all required fields')
        return
      }

      try {
        const saleData = {
          items: this.cart.map(item => ({
            ...item,
            discountType: item.discountValue > 0 ? 'amount' : null,
            discountValue: item.discountValue || 0
          })),
          paymentTypeID: this.selectedPaymentType,
          notes: '',
          saleDiscount: this.saleDiscountValue > 0 ? { type: 'amount', value: this.saleDiscountValue } : null
        }

        const response = await salesAPI.create(saleData)
        this.receiptData = response.data
        this.showReceipt = true
        this.clearCart()
        this.toast.success('Sale processed successfully')
      } catch (error) {
        this.toast.error('Failed to process sale')
        console.error(error)
      }
    },
    async printThermalReceipt() {
      if (!this.receiptData?.SaleID) {
        this.toast.error('Receipt data not available')
        return
      }

      try {
        const response = await salesAPI.printThermalReceipt(this.receiptData.SaleID, {
          width: 300,
          selectedPrintType: 'direct'
        })

        if (response.data.success && response.data.payload?.htmlContent) {
          const printWindow = window.open('', '_blank')
          printWindow.document.write(response.data.payload.htmlContent)
          printWindow.document.close()

          printWindow.onload = function() {
            printWindow.focus()
            printWindow.print()
            setTimeout(() => {
              printWindow.close()
            }, 1000)
          }
        } else {
          this.toast.error('Failed to generate receipt')
        }
      } catch (error) {
        this.toast.error('Failed to print receipt')
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
  },
  watch: {
    barcodeInput(value) {
      if (value) {
        this.filteredProducts = this.products.filter(p =>
          p.ProductName.toLowerCase().includes(value.toLowerCase()) ||
          (p.Barcode && p.Barcode.includes(value))
        )
      } else {
        this.filteredProducts = this.products
      }
    }
  }
}
</script>

<style scoped>
.pos-container {
  width: 100%;
}

.pos-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.pos-left {
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.product-list {
  margin-top: 15px;
  display: grid;
  gap: 10px;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.no-image {
  font-size: 12px;
  color: #999;
}

.product-item:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.product-image-small {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.product-price {
  color: #28a745;
  font-weight: 600;
}

.product-barcode {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
}

.cart-items {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.empty-cart {
  text-align: center;
  padding: 40px;
  color: #999;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.cart-item-details {
  font-size: 14px;
  color: #666;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.cart-item-line-total {
  font-size: 13px;
  font-weight: 600;
  color: #28a745;
  margin-top: 5px;
}

.cart-item-discount {
  margin-top: 5px;
}

.cart-item-discount-form {
  margin-top: 5px;
}

.form-row-small {
  display: flex;
  gap: 5px;
  align-items: center;
}

.input-small {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  flex: 1;
}

.btn-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  font-size: 12px;
  padding: 0;
}

.btn-link:hover {
  color: #0056b3;
}

.discount-badge {
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

.discount-section {
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-bottom: 15px;
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

.cart-item-options {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quantity {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
}

.cart-summary {
  border-top: 2px solid #eee;
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

.payment-section {
  border-top: 2px solid #eee;
  padding-top: 15px;
  margin-bottom: 20px;
}

.cart-actions {
  display: flex;
  gap: 10px;
}

.cart-actions .btn {
  flex: 1;
}

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

.receipt-summary {
  border-top: 2px solid #ddd;
  padding-top: 15px;
  margin-bottom: 20px;
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

@media (max-width: 1024px) {
  .pos-layout {
    grid-template-columns: 1fr;
  }
}

</style>

