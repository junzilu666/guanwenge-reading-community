// 路由表 + 全局前置守卫（需登录路由校验 token）
import { createRouter, createWebHistory } from 'vue-router'
import { store } from './store.js'

const routes = [
  { path: '/', name: 'home', component: () => import('./views/Home.vue'), meta: { title: '首页' } },
  { path: '/discover', name: 'discover', component: () => import('./views/Discover.vue'), meta: { title: '更多' } },
  { path: '/login', name: 'login', component: () => import('./views/Login.vue'), meta: { title: '登录' } },
  { path: '/article/:id', name: 'article', component: () => import('./views/ArticleDetail.vue'), meta: { title: '文章' } },
  { path: '/publish', name: 'publish', component: () => import('./views/Publish.vue'), meta: { requiresAuth: true, title: '发布文章' } },
  { path: '/favorites', name: 'favorites', component: () => import('./views/Favorites.vue'), meta: { requiresAuth: true, title: '我的收藏' } },
  { path: '/history', name: 'history', component: () => import('./views/History.vue'), meta: { requiresAuth: true, title: '阅读历史' } },
  { path: '/my-articles', name: 'my-articles', component: () => import('./views/MyArticles.vue'), meta: { requiresAuth: true, title: '我的文章' } },
  { path: '/settings', name: 'settings', component: () => import('./views/Settings.vue'), meta: { requiresAuth: true, title: '个人设置' } },
  { path: '/my', name: 'my', component: () => import('./views/Profile.vue'), meta: { title: '我的' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫：需要登录的路由未登录时跳转登录页并记录来源
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

// 切换页面标题
router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - 观文阁` : '观文阁'
})

export default router
