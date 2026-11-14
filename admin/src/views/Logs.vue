<template>
  <div class="page">
    <div class="toolbar">
      <span class="form-hint">共 {{ logs.length }} 条（最新在前）</span>
      <div class="spacer"></div>
      <button class="btn btn-ghost" :disabled="loading" @click="loadLogs">刷新</button>
    </div>

    <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
    <div v-else-if="logs.length" class="log-list">
      <div v-for="(line, i) in logs" :key="i" class="log-line">{{ line }}</div>
    </div>
    <div v-else class="card"><div class="empty">暂无系统日志</div></div>
  </div>
</template>

<script setup>
/**
 * Logs.vue —— 系统日志
 * 等宽字体日志列表，后端已按时间倒序返回，顶部提供刷新按钮。
 */
import { ref, onMounted } from 'vue'
import { getLogs, showToast } from '../api'

const logs = ref([])
const loading = ref(false)

async function loadLogs() {
  loading.value = true
  try {
    logs.value = await getLogs()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)
</script>
