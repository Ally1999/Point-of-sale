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
                v-if="product.ImagePath"
                :src="`http://localhost:3000${product.ImagePath}`"
                :alt="product.ProductName"
                class="product-image-small"
              />
              <div class="product-info">
                <div class="product-name">{{ product.ProductName }}</div>
                <div class="product-price">Rs{{ formatPrice(product.Price) }}</div>
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
                  <span>₱{{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</span>
                  <span v-if="item.isVAT" class="vat-badge">VAT {{ item.vatRate }}%</span>
                  <span v-if="item.discountAmount > 0" class="discount-badge">
                    Discount: ₱{{ formatPrice(item.discountAmount) }}
                  </span>
                </div>
                <div class="cart-item-line-total">
                  Line Total: ₱{{ formatPrice(getItemLineTotal(item)) }}
                </div>
                <div class="cart-item-discount" v-if="!item.showDiscount">
                  <button @click="showItemDiscount(index)" class="btn-link">Add Discount</button>
                </div>
                <div class="cart-item-discount-form" v-else>
                  <div class="form-row-small">
                    <select v-model="item.discountType" class="input-small">
                      <option value="">Select Type</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Amount (₱)</option>
                    </select>
                    <input
                      v-model.number="item.discountValue"
                      type="number"
                      step="0.01"
                      class="input-small"
                      placeholder="Value"
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
              <span>₱{{ formatPrice(originalSubtotal) }}</span>
            </div>
            <div class="summary-row" v-if="totalItemDiscounts > 0">
              <span>Item Discounts:</span>
              <span class="discount-text">-₱{{ formatPrice(totalItemDiscounts) }}</span>
            </div>
            <div class="summary-row" v-if="saleDiscountAmount > 0">
              <span>Sale Discount:</span>
              <span class="discount-text">-₱{{ formatPrice(saleDiscountAmount) }}</span>
            </div>
            <div class="summary-row">
              <span>Subtotal After Discount:</span>
              <span>₱{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="summary-row" v-if="vatAmount > 0">
              <span>VAT:</span>
              <span>₱{{ formatPrice(vatAmount) }}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>₱{{ formatPrice(totalAmount) }}</span>
            </div>
          </div>

          <div class="discount-section">
            <div class="form-group">
              <label>Sale Discount</label>
              <div class="form-row-small">
                <select v-model="saleDiscount.type" class="input-small">
                  <option value="">None</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Amount (₱)</option>
                </select>
                <input
                  v-model.number="saleDiscount.value"
                  type="number"
                  step="0.01"
                  class="input-small"
                  placeholder="Value"
                  @input="calculateSaleDiscount"
                />
              </div>
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
            <div class="form-group">
              <label>Amount Paid</label>
              <input
                v-model.number="amountPaid"
                type="number"
                step="0.01"
                class="input"
                placeholder="0.00"
              />
            </div>
            <div class="summary-row" v-if="changeAmount >= 0">
              <span>Change:</span>
              <span>₱{{ formatPrice(changeAmount) }}</span>
            </div>
          </div>

          <div class="cart-actions">
            <button @click="clearCart" class="btn btn-secondary">Clear</button>
            <button @click="processSale" :disabled="cart.length === 0 || !selectedPaymentType || amountPaid < totalAmount" class="btn btn-success">
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
          <p>{{ receiptData.saleNumber }}</p>
          <p>{{ formatDate(receiptData.saleDate) }}</p>
        </div>
        <div class="receipt-items">
          <div v-for="item in receiptData.items" :key="item.SaleItemID" class="receipt-item">
            <div class="receipt-item-name">{{ item.ProductName }}</div>
            <div class="receipt-item-details">
              {{ item.Quantity }} × ₱{{ formatPrice(item.UnitPrice) }}
              <span v-if="item.DiscountAmount > 0" class="discount-text">
                (Discount: -₱{{ formatPrice(item.DiscountAmount) }})
              </span>
              = ₱{{ formatPrice(item.LineTotal) }}
              <span v-if="item.IsVAT" class="vat-badge">VAT {{ item.VATRate }}%</span>
            </div>
          </div>
        </div>
        <div class="receipt-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₱{{ formatPrice(receiptData.subTotal) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.discountAmount > 0">
            <span>Sale Discount:</span>
            <span class="discount-text">-₱{{ formatPrice(receiptData.discountAmount) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.vatAmount > 0">
            <span>VAT:</span>
            <span>₱{{ formatPrice(receiptData.vatAmount) }}</span>
          </div>
          <div class="summary-row total">
            <span>Total:</span>
            <span>₱{{ formatPrice(receiptData.totalAmount) }}</span>
          </div>
          <div class="summary-row">
            <span>Payment:</span>
            <span>{{ receiptData.paymentName }}</span>
          </div>
          <div class="summary-row">
            <span>Amount Paid:</span>
            <span>₱{{ formatPrice(receiptData.amountPaid) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.changeAmount > 0">
            <span>Change:</span>
            <span>₱{{ formatPrice(receiptData.changeAmount) }}</span>
          </div>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your purchase!</p>
        </div>
        <div class="receipt-actions">
          <button @click="printReceipt" class="btn btn-primary">Print</button>
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
      amountPaid: 0,
      barcodeInput: '',
      showReceipt: false,
      receiptData: null,
      saleDiscount: {
        type: '',
        value: 0
      }
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
      let total = this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0)
      
      // Apply sale discount
      if (this.saleDiscountAmount > 0) {
        total -= this.saleDiscountAmount
      }
      
      return total
    },
    saleDiscountAmount() {
      if (!this.saleDiscount.type || this.saleDiscount.value <= 0) {
        return 0
      }
      
      const baseSubtotal = this.cart.reduce((sum, item) => {
        let lineTotal = item.unitPrice * item.quantity
        if (item.discountAmount) {
          lineTotal -= item.discountAmount
        }
        return sum + lineTotal
      }, 0)
      
      if (this.saleDiscount.type === 'percentage') {
        return baseSubtotal * (this.saleDiscount.value / 100)
      } else if (this.saleDiscount.type === 'amount') {
        return Math.min(this.saleDiscount.value, baseSubtotal)
      }
      return 0
    },
    vatAmount() {
      return this.cart.reduce((sum, item) => {
        if (item.isVAT) {
          let lineTotal = item.unitPrice * item.quantity
          if (item.discountAmount) {
            lineTotal -= item.discountAmount
          }
          return sum + (lineTotal * (item.vatRate / 100))
        }
        return sum
      }, 0)
    },
    totalAmount() {
      return this.subtotal + this.vatAmount
    },
    changeAmount() {
      return this.amountPaid - this.totalAmount
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
          discountType: '',
          discountValue: 0,
          discountAmount: 0,
          showDiscount: false
        })
      }
      
      this.barcodeInput = ''
      this.$refs.barcodeInputRef?.focus()
    },
    showItemDiscount(index) {
      this.$set(this.cart[index], 'showDiscount', true)
    },
    hideItemDiscount(index) {
      this.$set(this.cart[index], 'showDiscount', false)
      this.$set(this.cart[index], 'discountType', '')
      this.$set(this.cart[index], 'discountValue', 0)
      this.$set(this.cart[index], 'discountAmount', 0)
    },
    calculateItemDiscount(index) {
      const item = this.cart[index]
      if (!item.discountType || item.discountValue <= 0) {
        item.discountAmount = 0
        return
      }
      
      const lineTotal = item.unitPrice * item.quantity
      if (item.discountType === 'percentage') {
        item.discountAmount = lineTotal * (item.discountValue / 100)
      } else if (item.discountType === 'amount') {
        item.discountAmount = Math.min(item.discountValue, lineTotal)
      }
    },
    calculateSaleDiscount() {
      // Triggered by @input, computed property handles calculation
    },
    getItemLineTotal(item) {
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
      this.amountPaid = 0
      this.saleDiscount = {
        type: '',
        value: 0
      }
    },
    async processSale() {
      if (this.cart.length === 0 || !this.selectedPaymentType || this.amountPaid < this.totalAmount) {
        this.toast.error('Please complete all required fields')
        return
      }

      try {
        const saleData = {
          items: this.cart.map(item => ({
            ...item,
            discountType: item.discountType || null,
            discountValue: item.discountValue || 0
          })),
          paymentTypeID: this.selectedPaymentType,
          amountPaid: this.amountPaid,
          notes: '',
          saleDiscount: this.saleDiscount.type ? this.saleDiscount : null
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
    printReceipt() {
      window.print()
    },
    closeReceipt() {
      this.showReceipt = false
      this.receiptData = null
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2)
    },
    formatDate(date) {
      return new Date(date).toLocaleString()
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

