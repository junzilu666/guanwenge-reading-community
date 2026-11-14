<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">观文阁</h1>
      <p class="login-subtitle">后台管理系统</p>
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-item">
          <label class="form-label" for="username">账号</label>
          <input
            id="username"
            v-model.trim="form.username"
            class="input"
            type="text"
            placeholder="请输入管理员账号"
            autocomplete="username"
          />
        </div>
        <div class="form-item">
          <label class="form-label" for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
        <p class="login-tip">默认账号 admin 密码 admin</p>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * Login.vue —— 管理员登录页
 * 固定账号 admin/admin；登录成功后把 token 通过事件交给 App 切换布局。
 */
import { reactive, ref } from 'vue'
import { adminLogin, showToast } from '../api'

const emit = defineEmits(['login'])

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (!form.username || !form.password) {
    showToast('请输入账号和密码', 'error')
    return
  }
  loading.value = true
  try {
    const data = await adminLogin(form.username, form.password)
    showToast('登录成功')
    emit('login', data.token)
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}
</script>
