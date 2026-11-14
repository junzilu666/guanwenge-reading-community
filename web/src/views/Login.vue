<template>
  <!-- 登录 / 注册：国风卡片式 -->
  <div class="login-page">
    <div class="login-card card">
      <!-- Logo 与标题 -->
      <div class="login-brand">
        <span class="brand-seal">观</span>
        <h1 class="brand-title">观文阁</h1>
        <p class="brand-sub">与好文相遇，与知音同行</p>
      </div>

      <!-- Tab 切换 -->
      <div class="login-tabs">
        <button class="tab" :class="{ active: tab === 'login' }" @click="switchTab('login')">登录</button>
        <button class="tab" :class="{ active: tab === 'register' }" @click="switchTab('register')">注册</button>
      </div>

      <!-- 表单 -->
      <form @submit.prevent="submit">
        <div class="field">
          <label>用户名</label>
          <input v-model.trim="form.username" class="input" placeholder="2-16位中文/字母/数字/下划线" maxlength="16" />
        </div>
        <div v-if="tab === 'register'" class="field">
          <label>昵称</label>
          <input v-model.trim="form.nickname" class="input" placeholder="给自己取个好听的名字" maxlength="20" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="form.password" type="password" class="input" placeholder="至少 4 位" maxlength="32" />
        </div>
        <button class="btn primary block" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : (tab === 'login' ? '登 录' : '注册并登录') }}
        </button>
      </form>

      <p class="login-tip">登录即代表同意《观文阁社区规范》</p>
    </div>
  </div>
</template>

<script>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, createToast } from '../api.js'
import { store } from '../store.js'

export default {
  name: 'Login',
  setup() {
    const route = useRoute()
    const router = useRouter()

    const tab = ref('login') // login | register
    const loading = ref(false)
    const form = reactive({ username: '', password: '', nickname: '' })

    function switchTab(name) {
      tab.value = name
    }

    // 登录 / 注册提交
    async function submit() {
      if (!form.username) return createToast('请输入用户名')
      if (tab.value === 'register' && !form.nickname) return createToast('请输入昵称')
      if (!form.password) return createToast('请输入密码')

      loading.value = true
      try {
        let data
        if (tab.value === 'login') {
          data = await api.login({ username: form.username, password: form.password })
        } else {
          data = await api.register({ username: form.username, password: form.password, nickname: form.nickname })
        }
        // 保存 token 与用户信息（注册成功自动登录）
        store.login(data.token, data.user)
        createToast(tab.value === 'login' ? '登录成功，欢迎回来' : '注册成功，欢迎加入观文阁')
        // 跳转来源页或首页
        router.push(route.query.redirect || '/')
      } catch (e) {
        createToast(e.message || '操作失败')
      } finally {
        loading.value = false
      }
    }

    return { tab, form, loading, switchTab, submit }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}
.login-card {
  width: 100%;
  max-width: 400px;
  padding: 32px 26px;
}
.login-brand { text-align: center; margin-bottom: 24px; }
.brand-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-title);
  font-size: 26px;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(176, 58, 46, 0.35);
}
.brand-title { font-family: var(--font-title); font-size: 26px; letter-spacing: 4px; }
.brand-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }

/* Tab */
.login-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.login-tabs .tab {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  font-size: 15px;
  color: var(--text-3);
  position: relative;
  transition: color .2s ease;
}
.login-tabs .tab.active { color: var(--accent); font-weight: 600; }
.login-tabs .tab.active::after {
  content: '';
  position: absolute;
  left: 30%;
  right: 30%;
  bottom: -1px;
  height: 2px;
  background: var(--accent);
}

.login-tip { text-align: center; font-size: 12px; color: var(--text-3); margin-top: 16px; }
</style>
