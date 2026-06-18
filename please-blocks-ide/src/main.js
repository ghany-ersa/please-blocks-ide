import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/theme.css'
import { useDataRegistry } from './model/stores/dataRegistry.js'
import { useComponentStore } from './model/stores/componentStore.js'

const app   = createApp(App)
const pinia = createPinia()
app.use(pinia)

app.directive('click-outside', {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el._clickOutside)
  }
})

// Inisialisasi stores yang butuh processing saat boot
const dataRegistry   = useDataRegistry()
const componentStore = useComponentStore()
dataRegistry.processAndRegister()
componentStore.processAndRegister()

app.mount('#app')
