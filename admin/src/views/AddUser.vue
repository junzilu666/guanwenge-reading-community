<template>
  <div class="page">
    <div class="card add-card">
      <div class="card-title">添加用户</div>
      <p class="form-hint">由管理员手动创建用户账号，创建后自动生成该用户的独立文件夹（资料/成长/收藏/历史等）。</p>

      <div class="form-item">
        <label class="form-label">用户名 *</label>
        <input
          v-model.trim="form.username"
          class="input"
          type="text"
          placeholder="2-16位中文/字母/数字/下划线"
          maxlength="16"
        />
      </div>
      <div class="form-item">
        <label class="form-label">密码 *</label>
        <input
          v-model="form.password"
          class="input"
          type="text"
          placeholder="至少4位"
        />
      </div>
      <div class="form-item">
        <label class="form-label">昵称</label>
        <input
          v-model.trim="form.nickname"
          class="input"
          type="text"
          placeholder="选填，默认同用户名"
          maxlength="20"
        />
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost" @click="goBack">返回用户列表</button>
        <button class="btn btn-primary" :disabled="saving" @click="handleCreate">
          {{ saving ? '创建中…' : '创建用户' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AddUser.vue —— 添加用户
 * 管理员手动创建用户（POST /api/admin/users），创建成功自动生成用户文件夹。
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUser, showToast } from '../api'

const router = useRouter()
const saving = ref(false)
const form = reactive({ username: '', password: '', nickname: '' })

async function handleCreate() {
  if (!form.username) {
    showToast('请输入用户名', 'error')
    return
  }
  if (!form.password || form.password.length < 4) {
    showToast('密码至少4位', 'error')
    return
  }
  saving.value = true
  try {
    const data = await createUser({ ...form })
    showToast(`用户「${data.username}」创建成功`)
    router.push('/users')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/users')
}
</script>

<style scoped>
.add-card {
  max-width: 560px;
  margin: 0 auto;
  padding: 20px;
}
.form-item { margin-bottom: 14px; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
