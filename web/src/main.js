// 应用入口：创建 Vue 应用，挂载路由与全局样式
import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles/global.css'

// 挂载前根据 localStorage 偏好初始化主题（key: gw_theme），避免页面闪烁
(function initTheme() {
  const saved = localStorage.getItem('gw_theme')
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = saved === 'dark' || (saved !== 'light' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
})()

const app = createApp(App)
app.use(router)
app.mount('#app')
