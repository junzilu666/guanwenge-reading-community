<template>
  <div class="list-page">
    <div class="page-head">
      <h2 class="page-title">阅读历史</h2>
      <button v-if="list.length" class="btn sm clear-btn" @click="clearHistory">清空历史</button>
    </div>

    <div v-if="loading" class="list-status">正在加载…</div>

    <div v-else-if="list.length" class="history-list">
      <router-link v-for="h in list" :key="h.articleId" :to="`/article/${h.articleId}`" class="history-item card">
        <div class="history-content">
          <h3 class="history-title">{{ h.title }}</h3>
          <span class="history-time">{{ h.time }}</span>
        </div>
        <span class="history-arrow">›</span>
      </router-link>
    </div>

    <div v-else class="empty">
      <div class="empty-mark">史</div>
      <p>暂无阅读历史</p>
      <router-link to="/" class="btn sm">去读篇文章吧</router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api, createToast } from '../api.js'

export default {
  name: 'History',
  setup() {
    const list = ref([])
    const loading = ref(true)

    async function load() {
      loading.value = true
      try {
        list.value = await api.history()
      } catch (e) {
        createToast(e.message || '加载失败')
      } finally {
        loading.value = false
      }
    }

    // 清空阅读历史（二次确认）
    async function clearHistory() {
      if (!window.confirm('确定要清空全部阅读历史吗？')) return
      try {
        await api.clearHistory()
        list.value = []
        createToast('阅读历史已清空')
      } catch (e) {
        createToast(e.message || '操作失败')
      }
    }

    onMounted(load)

    return { list, loading, clearHistory }
  }
}
</script>

<style scoped>
.list-page { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.page-title { font-family: var(--font-title); font-size: 20px; }
.clear-btn { color: var(--danger); border-color: rgba(197, 48, 48, 0.3); }

.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.history-content { flex: 1; min-width: 0; }
.history-title {
  font-size: 15px;
  font-family: var(--font-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}
.history-time { font-size: 12px; color: var(--text-3); }
.history-arrow { color: var(--text-3); font-size: 20px; }

.list-status { padding: 40px 0; text-align: center; color: var(--text-3); font-size: 13px; }
</style>
