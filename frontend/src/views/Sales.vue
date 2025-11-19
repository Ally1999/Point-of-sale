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
.vat-excluded-badge {
  background: #6c757d;
  color: #fff;
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
  .vat-excluded-badge,
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

