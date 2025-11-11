import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import './style.css'
import App from './App.vue'
import POS from './views/POS.vue'
import Products from './views/Products.vue'
import Sales from './views/Sales.vue'

const routes = [
  { path: '/', redirect: '/pos' },
  { path: '/pos', component: POS },
  { path: '/products', component: Products },
  { path: '/sales', component: Sales }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 20,
  newestOnTop: true
})
app.mount('#app')

