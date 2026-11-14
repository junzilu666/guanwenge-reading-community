<template>
  <div class="app-shell">
    <!-- 顶部栏：Logo「观文阁」+ 搜索 + 深浅色切换 -->
    <header v-if="showChrome" class="app-header">
      <router-link to="/" class="logo">
        <span class="logo-seal">观</span>
        <span class="logo-text">观文阁</span>
      </router-link>
      <div class="header-actions">
        <!-- 搜索入口跳转「更多」页 -->
        <router-link to="/discover" class="icon-btn" aria-label="搜索" title="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </router-link>
        <!-- 主题切换：切换 html 根节点 class="dark"，localStorage 记住偏好 -->
        <button class="icon-btn" aria-label="切换深浅色" title="切换深浅色" @click="toggleTheme">
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 页面内容 -->
    <main class="app-main" :class="{ full: !showChrome }">
      <router-view />
    </main>

    <!-- 底部固定导航：首页 / 更多 / 我的 -->
    <nav v-if="showChrome" class="tab-bar">
      <router-link to="/" class="tab-item" :class="{ active: $route.path === '/' }">首页</router-link>
      <router-link to="/discover" class="tab-item" :class="{ active: $route.path === '/discover' }">更多</router-link>
      <router-link to="/my" class="tab-item" :class="{ active: $route.path === '/my' }">我的</router-link>
    </nav>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'App',
  setup() {
    const route = useRoute()

    // 主题状态初始值取自 main.js 中已应用到 html 根节点的 class
    const isDark = ref(document.documentElement.classList.contains('dark'))

    // 登录页与文章详情页隐藏顶栏/底栏（详情页沉浸式阅读）
    const showChrome = computed(() => !['login', 'article'].includes(route.name))

    // 切换深浅色主题并持久化
    function toggleTheme() {
      isDark.value = !isDark.value
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('gw_theme', isDark.value ? 'dark' : 'light')
    }

    return { isDark, showChrome, toggleTheme }
  }
}
</script>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }

/* ---------- 顶部栏 ---------- */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(6px);
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-seal {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-title);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(176, 58, 46, 0.4);
}
.logo-text {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}
.header-actions { display: flex; align-items: center; gap: 6px; }
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
  transition: all .2s ease;
}
.icon-btn:hover { background: var(--bg-muted); color: var(--accent); }
.icon-btn svg { width: 20px; height: 20px; }

/* ---------- 内容区 ---------- */
.app-main { flex: 1; padding-bottom: var(--tabbar-h); }
/* 全屏页面（登录 / 文章详情）不预留底栏 */
.app-main.full { padding-bottom: 0; }

/* ---------- 底部导航 ---------- */
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  height: var(--tabbar-h);
  display: flex;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-3);
  transition: color .2s ease;
  position: relative;
}
.tab-item.active { color: var(--accent); font-weight: 600; }
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 8px;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}
</style>
