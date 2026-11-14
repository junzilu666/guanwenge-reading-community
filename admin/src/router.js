/**
 * router.js —— 路由配置
 * 路由表 + 全局守卫：未登录（无 token）一律跳转 /login。
 */
import { createRouter, createWebHistory } from 'vue-router'
import { TOKEN_KEY } from './api'

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
  { path: '/', name: 'dashboard', component: () => import('./views/Dashboard.vue') },
  { path: '/rewards', name: 'rewards', component: () => import('./views/Rewards.vue') },
  { path: '/articles', name: 'articles', component: () => import('./views/Articles.vue') },
  { path: '/users', name: 'users', component: () => import('./views/Users.vue') },
  { path: '/users/add', name: 'user-add', component: () => import('./views/AddUser.vue') },
  { path: '/users/:username', name: 'user-detail', component: () => import('./views/UserDetail.vue') },
  { path: '/review', name: 'review', component: () => import('./views/Review.vue') },
  { path: '/settings', name: 'settings', component: () => import('./views/Settings.vue') },
  { path: '/logs', name: 'logs', component: () => import('./views/Logs.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局前置守卫：无 token 强制回登录页；已登录访问登录页则回首页
router.beforeEach((to) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token && to.path !== '/login') return '/login'
  if (token && to.path === '/login') return '/'
  return true
})

export default router
