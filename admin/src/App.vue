<template>
  <!-- 未登录：直接渲染登录页 -->
  <Login v-if="!token" @login="handleLogin" />
  <!-- 已登录：侧边栏布局 + 顶栏 + 路由视图 -->
  <div v-else class="layout">
    <aside class="sidebar">
      <div class="logo">观文阁 · 后台管理</div>
      <nav class="menu">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          active-class="active"
        >
          {{ item.name }}
        </router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <span class="topbar-title">{{ pageTitle }}</span>
        <div class="topbar-right">
          <span class="admin-name">管理员：admin</span>
          <button class="btn btn-ghost btn-sm" @click="handleLogout">退出登录</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
/**
 * App.vue —— 根组件
 * 以本地是否存在管理员 token 决定展示登录页或后台布局；
 * 未登录时登录页直接内嵌渲染（配合路由守卫双保险）。
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Login from './views/Login.vue'
import { TOKEN_KEY, setToken, clearToken } from './api'

const route = useRoute()
const router = useRouter()

// 是否已登录：读取本地 token
const token = ref(localStorage.getItem(TOKEN_KEY) || '')

// 侧边栏菜单配置
const menus = [
  { path: '/', name: '数据监测' },
  { path: '/rewards', name: '打赏统计' },
  { path: '/articles', name: '内容管理' },
  { path: '/users', name: '用户管理' },
  { path: '/review', name: '内容审核' },
  { path: '/settings', name: '系统配置' },
  { path: '/logs', name: '系统日志' },
]

// 顶栏标题跟随当前路由
const pageTitle = computed(() => {
  const hit = menus.find((m) => (m.path === '/' ? route.path === '/' : route.path.startsWith(m.path)))
  return hit ? hit.name : '观文阁 · 后台管理'
})

// 登录成功：保存 token 并进入首页
// 修复：必须先 setToken 持久化到 localStorage，路由守卫才能放行，否则会被重定向回登录页
function handleLogin(t) {
  token.value = t
  setToken(t)
  router.replace('/')
}

// 退出登录：清除 token 回到登录页
function handleLogout() {
  clearToken()
  token.value = ''
  router.replace('/login')
}
</script>
