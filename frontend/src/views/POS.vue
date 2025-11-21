<template>
  <div class="pos-container pos-page" aria-label="Point of Sale workspace">
    <div class="pos-banner">
      <div class="pos-banner-content">
        <span class="pos-text">Point of Sale</span>
      </div>
    </div>
    <div class="pos-layout">
      <!-- Product Search/Scan Section -->
      <section class="pos-left" aria-label="Product lookup and quick add">
        <div class="card pos-card">
          <header class="section-header">
            <div>
              <h2 class="pos-header">Scan or Tap Products</h2>
              <p class="section-subtitle">Enter a barcode or tap an item to add it to the cart.</p>
            </div>
            <span class="badge pos-badge" aria-live="polite">{{ filteredProducts.length }} items</span>
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
              @click="addToCart(product)"
              :aria-label="`Add ${product.ProductName} for Rs ${formatPrice(product.Price)}`"
            >
              <img
                v-if="product.ImageBase64"
                :src="product.ImageBase64"
                :alt="product.ProductName"
                class="product-image-small"
              />
              <span v-else class="no-image" aria-hidden="true">No Image</span>
              <div class="product-info">
                <div class="product-name">{{ product.ProductName }}</div>
                <div class="product-price">Rs {{ formatPrice(product.Price) }}</div>
                <div class="product-barcode" v-if="product.Barcode">{{ product.Barcode }}</div>
              </div>
              <span class="product-action">Add</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Cart Section -->
      <section class="pos-right" aria-label="Cart and checkout">
        <div class="card cart-card pos-cart-card">
          <header class="section-header">
            <div>
              <h2 class="pos-header">Cart</h2>
              <p class="section-subtitle">Review quantities, discounts, and taxes.</p>
            </div>
            <span class="badge pos-badge">{{ cart.length }} selected</span>
          </header>
          <div class="cart-items" role="list" aria-live="polite">
            <div v-if="cart.length === 0" class="empty-cart">Cart is empty</div>
            <article
              v-for="(item, index) in cart"
              :key="index"
              class="cart-item"
              role="listitem"
            >
              <div class="cart-item-info">
                <div class="cart-item-name">{{ item.productName }}</div>
                <div class="cart-item-details">
                  <span class="price-chip">Rs {{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</span>
                  <span v-if="item.isVAT && !item.excludeVAT" class="vat-badge">VAT {{ item.vatRate }}%</span>
                  <span v-if="item.isVAT && item.excludeVAT" class="vat-excluded-badge">VAT Excluded</span>
                  <span v-if="item.discountAmount > 0" class="discount-badge">
                    - Rs {{ formatPrice(item.discountAmount) }}
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
                      placeholder="Discount amount"
                      @input="calculateItemDiscount(index)"
                    />
                    <button @click="hideItemDiscount(index)" class="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
              <div class="cart-item-actions" aria-label="Quantity controls">
                <button @click="decreaseQuantity(index)" class="btn btn-secondary circle-btn" :aria-label="`Decrease ${item.productName}`">-</button>
                <span class="quantity">{{ item.quantity }}</span>
                <button @click="increaseQuantity(index)" class="btn btn-secondary circle-btn" :aria-label="`Increase ${item.productName}`">+</button>
                <button @click="removeFromCart(index)" class="btn btn-danger circle-btn" :aria-label="`Remove ${item.productName}`">×</button>
              </div>
            </article>
          </div>

          <div class="cart-summary" role="status" aria-live="polite">
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
            <div class="summary-row total pos-total">
              <span>Total:</span>
              <span>Rs {{ formatPrice(totalAmount) }}</span>
            </div>
          </div>

          <div class="discount-section">
            <div class="form-group">
              <label for="sale-discount-input">Sale Discount (Amount)</label>
              <input
                id="sale-discount-input"
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
              <label for="payment-type-select">Payment Type</label>
              <select id="payment-type-select" v-model="selectedPaymentType" class="input">
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
      </section>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceipt" class="modal" @click.self="closeReceipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div class="modal-content receipt" id="receipt">
        <div class="receipt-header">
          <h2 id="receipt-title">Receipt</h2>
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
              discountValue: item.discountValue || 0
          })),
          paymentTypeID: this.selectedPaymentType,
          notes: '',
          saleDiscount: this.saleDiscountValue > 0 ? { value: this.saleDiscountValue } : null
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

        if (response.data.success && response.data.payload) {
          // Try WebUSB direct printing first
          if (response.data.payload.escPosCommands && 'usb' in navigator) {
            try {
              await this.printViaWebUSB(response.data.payload.escPosCommands)
              this.toast.success('Receipt sent directly to printer')
              return
            } catch (usbError) {
              console.warn('WebUSB printing failed, falling back to print dialog:', usbError)
              this.toast.warning(usbError.message || 'Direct printing unavailable, opening print dialog')
              // Fall through to print dialog
            }
          }

           // Fallback to print dialog on current page
           if (response.data.payload.htmlContent) {
             // Create a hidden iframe for printing
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
               
               // Remove iframe after printing
               setTimeout(() => {
                 document.body.removeChild(iframe)
               }, 1000)
             }

             iframe.contentDocument.open()
             iframe.contentDocument.write(response.data.payload.htmlContent)
             iframe.contentDocument.close()
           } else {
             this.toast.error('Failed to generate receipt')
           }
        } else {
          this.toast.error('Failed to generate receipt')
        }
      } catch (error) {
        this.toast.error('Failed to print receipt')
        console.error(error)
      }
    },
    async printViaWebUSB(base64Commands) {
      if (!('usb' in navigator)) {
        throw new Error('WebUSB not supported in this browser. Please use Chrome or Edge.')
      }

      // Decode base64 commands
      const binaryString = atob(base64Commands)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      try {
        // Request USB device (thermal printer)
        // User will see a dialog to select their printer
        const device = await navigator.usb.requestDevice({
          filters: [
            { classCode: 7 } // Printer class
          ]
        })

        await device.open()
        
        // Select configuration
        await device.selectConfiguration(1)
        
        // Find the printer interface
        const configuration = device.configuration
        const interfaceNumber = configuration.interfaces.find(
          iface => iface.alternates.some(alt => alt.interfaceClass === 7)
        )?.interfaceNumber

        if (interfaceNumber === undefined) {
          throw new Error('Printer interface not found. Please ensure your printer is connected and recognized.')
        }

        const alternate = configuration.interfaces[interfaceNumber].alternates[0]
        await device.claimInterface(interfaceNumber)

        // Find the OUT endpoint
        const outEndpoint = alternate.endpoints.find(ep => ep.direction === 'out')
        if (!outEndpoint) {
          throw new Error('Printer output endpoint not found')
        }

        // Send data in chunks (USB has packet size limits)
        const chunkSize = outEndpoint.packetSize || 64
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize)
          await device.transferOut(outEndpoint.endpointNumber, chunk)
        }

        await device.releaseInterface(interfaceNumber)
        await device.close()
        
        return true
      } catch (error) {
        if (error.name === 'NotFoundError') {
          throw new Error('No printer selected. Please connect a USB thermal printer and try again.')
        }
        throw error
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
.pos-page {
  width: 100%;
  padding-bottom: 48px;
  position: relative;
}

.pos-banner {
  background: linear-gradient(135deg, #1f6feb 0%, #174ea6 100%);
  color: white;
  padding: 12px 24px;
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(31, 111, 235, 0.3);
}

.pos-banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.1rem;
}

.pos-text {
  letter-spacing: 0.5px;
}

.pos-container {
  width: 100%;
  padding-bottom: 48px;
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

.pos-card {
  border-left: 4px solid #1f6feb;
}

.pos-cart-card {
  border-left: 4px solid #1f6feb;
}

.pos-header {
  color: #1f6feb;
  position: relative;
  padding-left: 12px;
}

.pos-badge {
  background: rgba(31, 111, 235, 0.15);
  color: #174ea6;
  border: 1px solid rgba(31, 111, 235, 0.3);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
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

.cart-items {
  max-height: 480px;
  overflow-y: auto;
  margin-bottom: 24px;
  padding-right: 6px;
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
  gap: 18px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(15,23,42,0.08);
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-weight: 700;
  margin-bottom: 6px;
  font-size: 1.05rem;
}

.cart-item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: var(--color-muted, #64748b);
  font-size: 0.95rem;
}

.price-chip {
  background: rgba(31,111,235,0.08);
  color: #0f172a;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.cart-item-line-total {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-success, #25a05c);
  margin-top: 6px;
}

.cart-item-discount,
.cart-item-discount-form {
  margin-top: 8px;
}

.form-row-small {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-small {
  padding: 10px;
  border: 2px solid var(--color-border, #dce3f1);
  border-radius: 12px;
  font-size: 0.95rem;
  flex: 1;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary, #1f6feb);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.92rem;
  padding: 0;
}

.btn-link:hover {
  color: var(--color-primary-dark, #174ea6);
}

.discount-badge {
  background: rgba(249,115,22,0.15);
  color: #b45309;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.discount-text {
  color: var(--color-danger, #d92d20);
  font-weight: 700;
}

.discount-section,
.payment-section {
  border-top: 1px solid rgba(15,23,42,0.08);
  padding-top: 18px;
  margin-bottom: 18px;
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

.cart-item-options {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(15,23,42,0.15);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #64748b;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.circle-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  padding: 0;
  display: grid;
  place-items: center;
}

.quantity {
  min-width: 38px;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.cart-summary {
  border-top: 2px solid rgba(31, 111, 235, 0.2);
  background: rgba(31, 111, 235, 0.06);
  border-radius: 18px;
  padding: 18px 22px;
  margin-bottom: 22px;
  border-left: 3px solid #1f6feb;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 1rem;
}

.summary-row.total {
  font-size: 1.35rem;
  font-weight: 700;
  border-top: 2px solid rgba(15,23,42,0.12);
  padding-top: 12px;
  margin-top: 12px;
}

.pos-total {
  color: #25a05c !important;
  background: rgba(37, 160, 92, 0.08);
  padding: 12px 16px;
  border-radius: 12px;
  margin-top: 8px;
  border: 2px solid rgba(37, 160, 92, 0.2);
}

.cart-actions {
  display: flex;
  gap: 12px;
}

.cart-actions .btn {
  flex: 1;
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

@media (max-width: 640px) {
  .product-list {
    grid-template-columns: 1fr;
  }

  .cart-actions {
    flex-direction: column;
  }
}
</style>

