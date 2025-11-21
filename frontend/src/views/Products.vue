<template>
  <div class="products-container">
    <div class="page-header">
      <h1>Products</h1>
      <button @click="openAddModal" class="btn btn-primary">Add Product</button>
    </div>

    <div class="card">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          class="input"
          placeholder="Search products..."
        />
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Barcode</th>
            <th>Price</th>
            <th>VAT</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.ProductID">
            <td>
              <img
                v-if="product.ImageBase64"
                :src="product.ImageBase64"
                :alt="product.ProductName"
                class="product-thumb"
              />
              <span v-else class="no-image">No Image</span>
            </td>
            <td>{{ product.ProductName }}</td>
            <td>{{ product.Barcode || '-' }}</td>
            <td>Rs {{ formatPrice(product.Price) }}</td>
            <td>
              <span v-if="product.IsVAT" class="vat-badge">VAT {{ product.VATRate }}%</span>
              <span v-else class="non-vat-badge">Non-VAT</span>
            </td>
            <td>
              <button @click="openEditModal(product)" class="btn btn-secondary btn-actions" style="margin-right: 5px;">Edit</button>
              <button @click="deleteProduct(product.ProductID)" class="btn btn-danger btn-actions">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Product Modal -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingProduct ? 'Edit Product' : 'Add Product' }}</h2>
          <button @click="closeModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveProduct">
          <div class="form-group">
            <label>Product Name *</label>
            <input v-model="formData.ProductName" type="text" class="input" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Barcode</label>
              <input v-model="formData.Barcode" type="text" class="input" required/>
            </div>
            <div class="form-group">
              <label>SKU</label>
              <input v-model="formData.SKU" type="text" class="input" />
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="formData.Description" class="input" rows="3"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Price *</label>
              <input v-model.number="formData.Price" type="number" step="0.01" class="input" required />
            </div>
            <div class="form-group">
              <label>Cost</label>
              <input v-model.number="formData.Cost" type="number" step="0.01" class="input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select v-model.number="formData.CategoryID" class="input">
                <option :value="null">Select Category</option>
                <option v-for="cat in categories" :key="cat.CategoryID" :value="cat.Description">
                  {{ cat.Description }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>
                <input v-model="formData.IsVAT" type="checkbox" />
                VAT Item
              </label>
            </div>
            <div class="form-group" v-if="formData.IsVAT">
              <label>VAT Rate (%)</label>
              <input v-model.number="formData.VATRate" type="number" step="0.01" class="input" />
            </div>
          </div>
          <div class="form-group">
            <label>Product Image</label>
            <input @change="handleImageChange" type="file" accept="image/*" class="input" />
            <div v-if="imagePreview" class="current-image">
              <img :src="imagePreview" alt="Preview" class="preview-image" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { productsAPI, categoriesAPI } from '../api/api.js'
import { useToast } from 'vue-toastification'

export default {
  name: 'Products',
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      products: [],
      categories: [],
      searchQuery: '',
      showModal: false,
      editingProduct: null,
      imagePreview: null,
      formData: {
        ProductName: '',
        Barcode: '',
        SKU: '',
        Description: '',
        Price: 0,
        Cost: 0,
        CategoryID: null,
        IsVAT: true,
        VATRate: 15.00,
        ImageBase64: null
      }
    }
  },
  computed: {
    filteredProducts() {
      if (!this.searchQuery) return this.products
      const query = this.searchQuery.toLowerCase()
      return this.products.filter(p =>
        p.ProductName.toLowerCase().includes(query) ||
        (p.Barcode && p.Barcode.toLowerCase().includes(query)) ||
        (p.SKU && p.SKU.toLowerCase().includes(query))
      )
    }
  },
  mounted() {
    this.loadProducts()
    this.loadCategories()
  },
  methods: {
    async loadProducts() {
      try {
        const response = await productsAPI.getAll()
        this.products = response.data
      } catch (error) {
        this.toast.error('Failed to load products')
        console.error(error)
      }
    },
    async loadCategories() {
      try {
        const response = await categoriesAPI.getAll()
        this.categories = response.data
      } catch (error) {
        console.error(error)
      }
    },
    openAddModal() {
      this.editingProduct = null
      this.resetForm()
      this.showModal = true
    },
    openEditModal(product) {
      this.editingProduct = product
      this.formData = {
        ProductName: product.ProductName,
        Barcode: product.Barcode || '',
        SKU: product.SKU || '',
        Description: product.Description || '',
        Price: product.Price,
        Cost: product.Cost || 0,
        CategoryID: product.CategoryID,
        IsVAT: product.IsVAT === true || product.IsVAT === 1,
        VATRate: product.VATRate || 15.00,
        ImageBase64: product.ImageBase64 || null
      }
      this.imagePreview = product.ImageBase64 || null
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.resetForm()
    },
    resetForm() {
      this.formData = {
        ProductName: '',
        Barcode: '',
        SKU: '',
        Description: '',
        Price: 0,
        Cost: 0,
        CategoryID: null,
        IsVAT: true,
        VATRate: 15.00,
        ImageBase64: null
      }
      this.imagePreview = null
    },
    handleImageChange(event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.formData.ImageBase64 = e.target.result
          this.imagePreview = this.formData.ImageBase64
        }
        reader.readAsDataURL(file)
      } else {
        this.formData.ImageBase64 = null
        this.imagePreview = null
      }
    },
    async saveProduct() {
      try {
        const data = {
          ...this.formData,
          CategoryID: this.formData.CategoryID || null,
          ImageBase64: this.formData.ImageBase64 || null
        }

        if (this.editingProduct) {
          await productsAPI.update(this.editingProduct.ProductID, data)
          this.toast.success('Product updated successfully')
        } else {
          await productsAPI.create(data)
          this.toast.success('Product created successfully')
        }

        this.closeModal()
        this.loadProducts()
      } catch (error) {
        this.toast.error('Failed to save product')
        console.error(error)
      }
    },
    async deleteProduct(id) {
      if (!confirm('Are you sure you want to delete this product?')) return

      try {
        await productsAPI.delete(id)
        this.toast.success('Product deleted successfully')
        this.loadProducts()
      } catch (error) {
        this.toast.error('Failed to delete product')
        console.error(error)
      }
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2)
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.product-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.no-image {
  color: #999;
  font-size: 12px;
}

.non-vat-badge {
  background: #6c757d;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.current-image {
  margin-top: 10px;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-actions {
  font-size: 1rem;
  padding: 10px 16px;
}
</style>

