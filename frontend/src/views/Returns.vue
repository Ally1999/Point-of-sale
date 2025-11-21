<template>
  <div class="pos-container returns-page" aria-label="Returns workspace">
    <div class="pos-layout">
      <!-- Product Search/Scan Section -->
      <section class="pos-left" aria-label="Product lookup and quick add">
        <div class="card return-card">
          <header class="section-header">
            <div>
              <h2 class="return-header">Scan or Tap Products to Return</h2>
              <p class="section-subtitle">Enter a barcode or tap an item to add it to the return cart.</p>
            </div>
            <span class="badge return-badge" aria-live="polite">{{ filteredProducts.length }} items</span>
          </header>
          <div class="form-group">
            <label for="product-search-input">Barcode / Product Search</label>
            <input
              id="product-search-input"
              v-model="barcodeInput"
              @keyup.enter="scanBarcode"
              type="text"
              class="input"
              placeholder="Scan barcode or start typing"
              ref="barcodeInputRef"
              inputmode="search"
              autocomplete="off"
              aria-describedby="product-search-hint"
            />
            <small id="product-search-hint" class="field-hint">Press Enter to add the top match instantly.</small>
          </div>
          <div class="product-list" role="list">
            <button
              v-for="product in filteredProducts"
              :key="product.ProductID"
              type="button"
              class="product-item"
              @click="addToReturnCart(product)"
              :aria-label="`Add ${product.ProductName} for Rs ${formatPrice(product.Price)}`"
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
              <span class="product-action return-action">Return</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Return Cart Section -->
      <section class="pos-right" aria-label="Return cart and checkout">
        <div class="card cart-card return-cart-card">
          <header class="section-header">
            <div>
              <h2 class="return-header">Return Cart</h2>
              <p class="section-subtitle">Review items to be returned.</p>
            </div>
            <span class="badge return-badge">{{ returnCart.length }} selected</span>
          </header>
          <div class="cart-items" role="list" aria-live="polite">
            <div v-if="returnCart.length === 0" class="empty-cart">Cart is empty</div>
            <article
              v-for="(item, index) in returnCart"
              :key="index"
              class="cart-item"
              role="listitem"
            >
              <div class="cart-item-main">
                <div class="cart-item-header">
                  <div class="cart-item-name">{{ item.productName }}</div>
                  <div class="cart-item-total">Rs {{ formatPrice(getItemLineTotal(item)) }}</div>
                </div>
                <div class="cart-item-details-compact">
                  <span class="price-info">Rs {{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</span>
                  <span v-if="item.isVAT && !item.excludeVAT" class="vat-badge-small">VAT {{ item.vatRate }}%</span>
                  <span v-if="item.isVAT && item.excludeVAT" class="vat-excluded-badge-small">VAT Excl</span>
                </div>
                <div class="cart-item-options-compact" v-if="item.isVAT">
                  <label class="checkbox-label-compact">
                    <input 
                      type="checkbox" 
                      v-model="item.excludeVAT"
                    />
                    <span>Exclude VAT</span>
                  </label>
                </div>
              </div>
              <div class="cart-item-actions" aria-label="Quantity controls">
                <button @click="decreaseQuantity(index)" class="btn btn-secondary btn-qty" :aria-label="`Decrease ${item.productName}`">−</button>
                <span class="quantity">{{ item.quantity }}</span>
                <button @click="increaseQuantity(index)" class="btn btn-secondary btn-qty" :aria-label="`Increase ${item.productName}`">+</button>
                <button @click="removeFromCart(index)" class="btn btn-danger btn-remove" :aria-label="`Remove ${item.productName}`">×</button>
              </div>
            </article>
          </div>

          <div class="cart-summary" role="status" aria-live="polite">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>Rs {{ formatPrice(returnSubtotal) }}</span>
            </div>
            <div class="summary-row" v-if="returnVAT > 0">
              <span>VAT:</span>
              <span>Rs {{ formatPrice(returnVAT) }}</span>
            </div>
            <div class="summary-row total return-total">
              <span>Refund Amount:</span>
              <span>Rs {{ formatPrice(returnTotal) }}</span>
            </div>
          </div>

          <div class="payment-section">
            <div class="form-group">
              <label for="payment-type-select">Payment Method for Refund</label>
              <select id="payment-type-select" v-model="selectedPaymentType" class="input">
                <option v-for="payment in paymentTypes" :key="payment.PaymentTypeID" :value="payment.PaymentTypeID">
                  {{ payment.PaymentName }}
                </option>
              </select>
            </div>
          </div>

          <div class="cart-actions">
            <button @click="clearCart" class="btn btn-secondary">Clear</button>
            <button 
              @click="processReturn" 
              :disabled="returnCart.length === 0 || !selectedPaymentType" 
              class="btn btn-warning"
            >
              Process Return
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Return Receipt Modal -->
    <div v-if="showReceipt" class="modal" @click.self="closeReceipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div class="modal-content receipt" id="receipt">
        <div class="receipt-header">
          <h2 id="receipt-title">Return Receipt</h2>
          <p>{{ receiptData.SaleNumber }}</p>
          <p>{{ formatDate(receiptData.SaleDate) }}</p>
        </div>
        <div class="receipt-items">
          <div v-for="item in receiptData.items" :key="item.SaleItemID" class="receipt-item">
            <div class="receipt-item-name">{{ item.ProductName }}</div>
            <div class="receipt-item-details">
              {{ Math.abs(item.Quantity) }} × Rs {{ formatPrice(item.UnitPrice) }}
              = Rs {{ formatPrice(Math.abs(item.LineTotal)) }}
              <span v-if="item.IsVAT && !item.ExcludeVAT" class="vat-badge">VAT {{ item.VATRate }}%</span>
            </div>
          </div>
        </div>
        <div class="receipt-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>Rs {{ formatPrice(Math.abs(receiptData.SubTotal)) }}</span>
          </div>
          <div class="summary-row" v-if="receiptData.VATAmount < 0">
            <span>VAT:</span>
            <span>Rs {{ formatPrice(Math.abs(receiptData.VATAmount)) }}</span>
          </div>
          <div class="summary-row total">
            <span>Refund Amount:</span>
            <span>Rs {{ formatPrice(Math.abs(receiptData.TotalAmount)) }}</span>
          </div>
          <div class="summary-row">
            <span>Payment:</span>
            <span>{{ receiptData.PaymentName }}</span>
          </div>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your return!</p>
        </div>
        <div class="receipt-actions">
          <button @click="printReceipt" class="btn btn-primary">Print Receipt</button>
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
  name: 'Returns',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      products: [],
      filteredProducts: [],
      returnCart: [],
      paymentTypes: [],
      selectedPaymentType: null,
      barcodeInput: '',
      showReceipt: false,
      receiptData: null,
    }
  },
  computed: {
    returnSubtotal() {
      let subtotal = 0
      for (const item of this.returnCart) {
        let lineTotal = item.unitPrice * item.quantity
        if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
          const vat = (lineTotal * item.vatRate) / 100
          subtotal += lineTotal - vat
        } else {
          subtotal += lineTotal
        }
      }
      return -subtotal // Negative for return
    },
    returnVAT() {
      let vat = 0
      for (const item of this.returnCart) {
        if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
          let lineTotal = item.unitPrice * item.quantity
          vat += (lineTotal * item.vatRate) / 100
        }
      }
      return -vat // Negative for return
    },
    returnTotal() {
      return this.returnSubtotal + this.returnVAT
    }
  },
  watch: {
    barcodeInput(newVal) {
      if (!newVal) {
        this.filteredProducts = this.products
        return
      }
      const search = newVal.toLowerCase()
      this.filteredProducts = this.products.filter(p => 
        p.ProductName.toLowerCase().includes(search) ||
        (p.Barcode && p.Barcode.toLowerCase().includes(search))
      )
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
        this.addToReturnCart(response.data)
        this.barcodeInput = ''
        this.$refs.barcodeInputRef?.focus()
      } catch (error) {
        this.toast.error('Product not found')
        this.barcodeInput = ''
      }
    },
    addToReturnCart(product) {
      const existingIndex = this.returnCart.findIndex(item => item.productID === product.ProductID)
      
      if (existingIndex >= 0) {
        this.returnCart[existingIndex].quantity++
      } else {
        this.returnCart.push({
          productID: product.ProductID,
          productName: product.ProductName,
          barcode: product.Barcode,
          unitPrice: parseFloat(product.Price),
          quantity: 1,
          isVAT: product.IsVAT === true || product.IsVAT === 1,
          vatRate: parseFloat(product.VATRate || 0),
          excludeVAT: false
        })
      }
      
      this.barcodeInput = ''
      this.$refs.barcodeInputRef?.focus()
    },
    getItemLineTotal(item) {
      let lineTotal = item.unitPrice * item.quantity
      return -lineTotal // Negative for return
    },
    increaseQuantity(index) {
      this.returnCart[index].quantity++
    },
    decreaseQuantity(index) {
      if (this.returnCart[index].quantity > 1) {
        this.returnCart[index].quantity--
      } else {
        this.removeFromCart(index)
      }
    },
    removeFromCart(index) {
      this.returnCart.splice(index, 1)
    },
    clearCart() {
      this.returnCart = []
    },
    async processReturn() {
      if (this.returnCart.length === 0 || !this.selectedPaymentType) {
        this.toast.error('Please complete all required fields')
        return
      }

      try {
        const returnData = {
          items: this.returnCart.map(item => ({
            productID: item.productID,
            productName: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            isVAT: item.isVAT,
            vatRate: item.vatRate,
            excludeVAT: item.excludeVAT,
            discountValue: 0
          })),
          paymentTypeID: this.selectedPaymentType,
        }

        const response = await salesAPI.createReturn(returnData)
        this.receiptData = response.data
        this.showReceipt = true
        this.clearCart()
        this.toast.success('Return processed successfully')
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Failed to process return'
        this.toast.error(errorMessage)
        console.error(error)
      }
    },
    closeReceipt() {
      this.showReceipt = false
      this.receiptData = null
    },
    async printReceipt() {
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
          const iframe = document.createElement('iframe')
          iframe.style.position = 'fixed'
          iframe.style.right = '0'
          iframe.style.bottom = '0'
          iframe.style.width = '0'
          iframe.style.height = '0'
          iframe.style.border = 'none'
          document.body.appendChild(iframe)

          iframe.onload = () => {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
            setTimeout(() => {
              document.body.removeChild(iframe)
            }, 1000)
          }

          iframe.contentDocument.open()
          iframe.contentDocument.write(response.data.payload.htmlContent)
          iframe.contentDocument.close()
        }
      } catch (error) {
        this.toast.error('Failed to print receipt')
        console.error(error)
      }
    },
    formatPrice(price) {
      return Math.abs(parseFloat(price || 0)).toFixed(2)
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
.returns-page {
  width: 100%;
  padding-bottom: 0px;
  position: relative;
}

.returns-banner {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: white;
  padding: 12px 24px;
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.returns-banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.1rem;
}

.returns-icon {
  font-size: 1.5rem;
}

.returns-text {
  letter-spacing: 0.5px;
}

.return-card {
  border-left: 4px solid #f59e0b;
}

.return-cart-card {
  border-left: 4px solid #f59e0b;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.return-header {
  color: #f59e0b;
  position: relative;
  padding-left: 12px;
}

.return-header::before {
  position: absolute;
  left: 0;
  font-size: 1.2rem;
}

.return-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.return-total {
  color: #dc2626 !important;
  background: rgba(220, 38, 38, 0.08);
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 6px;
  border: 2px solid rgba(220, 38, 38, 0.2);
}

.returns-page .product-item:hover,
.returns-page .product-item:focus-visible {
  border-color: #f59e0b;
  box-shadow: 0 15px 40px rgba(245, 158, 11, 0.25);
}

.returns-page .cart-item-line-total {
  color: #f59e0b;
}

.pos-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 32px;
  align-items: flex-start;
}

.pos-left {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 6px;
}

.pos-right {
  max-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-shrink: 0;
}

.section-header h2 {
  font-size: 1.35rem;
  margin-bottom: 6px;
}

.section-subtitle {
  color: var(--color-muted, #5f6b7c);
  font-size: 0.95rem;
}

.badge {
  background: rgba(31,111,235,0.12);
  color: var(--color-primary, #1f6feb);
  border-radius: 999px;
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.9rem;
}

.field-hint {
  display: block;
  margin-top: 6px;
  color: var(--color-muted, #6b7280);
  font-size: 0.9rem;
}

.product-list {
  margin-top: 20px;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.product-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border: 2px solid rgba(31,111,235,0.08);
  border-radius: 16px;
  background: #fff;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.product-item:hover,
.product-item:focus-visible {
  border-color: var(--color-primary, #1f6feb);
  box-shadow: 0 15px 40px rgba(31,111,235,0.18);
  transform: translateY(-2px);
  outline: none;
}

.product-image-small {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
}

.no-image {
  font-size: 0.85rem;
  color: var(--color-muted, #94a3b8);
}

.product-info {
  flex: 1;
}

.product-name {
  font-weight: 700;
  margin-bottom: 4px;
  font-size: 1.05rem;
}

.product-price {
  color: var(--color-success, #25a05c);
  font-weight: 700;
}

.product-barcode {
  font-size: 0.85rem;
  color: var(--color-muted, #6b7280);
  margin-top: 2px;
}

.product-action {
  font-weight: 600;
  color: var(--color-primary, #1f6feb);
}

.return-action {
  color: #f59e0b;
  font-weight: 700;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 20px;
  padding-right: 8px;
  min-height: 0;
}

.cart-items::-webkit-scrollbar {
  width: 6px;
}

.cart-items::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.cart-items::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.cart-items::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.empty-cart {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-muted, #94a3b8);
  font-size: 1.05rem;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.cart-item:hover {
  background: #f3f4f6;
  border-color: #f59e0b;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
}

.cart-item-main {
  flex: 1;
  min-width: 0;
}

.cart-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
}

.cart-item-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e293b;
  flex: 1;
  line-height: 1.3;
}

.cart-item-total {
  font-weight: 700;
  font-size: 1rem;
  color: #dc2626;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}

.cart-item-details-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.85rem;
}

.price-info {
  color: #64748b;
  font-weight: 500;
}

.price-chip {
  background: rgba(31,111,235,0.08);
  color: #0f172a;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.vat-badge-small,
.vat-excluded-badge-small {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.vat-badge-small {
  background: rgba(99,102,241,0.15);
  color: #3730a3;
}

.vat-excluded-badge-small {
  background: rgba(15,23,42,0.1);
  color: #0f172a;
}

.cart-item-options-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.checkbox-label-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #64748b;
  cursor: pointer;
}

.checkbox-label-compact input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin: 0;
}

.checkbox-label-compact span {
  font-size: 0.8rem;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-qty {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  font-weight: 600;
  min-width: 32px;
}

.btn-remove {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 600;
  min-width: 32px;
}

.quantity {
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e293b;
}

.discount-section,
.payment-section {
  border-top: 1px solid rgba(15,23,42,0.08);
  padding-top: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.discount-section .form-group,
.payment-section .form-group {
  margin-bottom: 0;
}

.discount-section label,
.payment-section label {
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.discount-section .input,
.payment-section .input,
.payment-section select {
  padding: 8px 12px;
  font-size: 0.9rem;
  height: auto;
}

.vat-badge {
  background: rgba(99,102,241,0.18);
  color: #3730a3;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.vat-excluded-badge {
  background: rgba(15,23,42,0.12);
  color: #0f172a;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.cart-summary {
  border-top: 2px solid rgba(245, 158, 11, 0.2);
  background: rgba(245, 158, 11, 0.06);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-left: 3px solid #f59e0b;
  flex-shrink: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.9rem;
}

.summary-row.total {
  font-size: 1.1rem;
  font-weight: 700;
  border-top: 2px solid rgba(15,23,42,0.12);
  padding-top: 8px;
  margin-top: 8px;
  color: #dc2626;
}

.cart-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 8px;
}

.cart-actions .btn {
  flex: 1;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
}

.cart-card {
  position: sticky;
  top: 0;
}

.receipt {
  max-width: 420px;
  padding: 32px;
}

.receipt-header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 15px;
}

.receipt-header p {
  margin: 4px 0;
  color: #64748b;
}

.receipt-items {
  margin-bottom: 20px;
}

.receipt-item {
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
}

.receipt-item-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.receipt-item-details {
  font-size: 0.95rem;
  color: #475569;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.receipt-summary {
  border-top: 2px solid #e2e8f0;
  padding-top: 15px;
  margin-bottom: 18px;
}

.receipt-footer {
  text-align: center;
  padding-top: 15px;
  border-top: 2px dashed #e2e8f0;
  color: #475569;
}

.receipt-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.receipt-actions .btn {
  flex: 1;
}

@media (max-width: 1200px) {
  .pos-layout {
    grid-template-columns: 1fr;
  }

  .cart-card {
    position: static;
  }

  .pos-left {
    max-height: none;
  }
}
</style>

