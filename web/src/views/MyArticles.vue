<template>
  <div class="list-page">
    <h2 class="page-title">我的文章</h2>

    <div v-if="loading" class="list-status">正在加载…</div>

    <div v-else-if="list.length" class="article-list">
      <router-link v-for="a in list" :key="a.id" :to="`/article/${a.id}`" class="article-item">
        <div class="item-top">
          <span class="status-badge" :class="statusMap[a.status]?.cls">{{ statusMap[a.status]?.text }}</span>
          <span v-if="a.pinned" class="pin-tag">置顶</span>
        </div>
        <h3 class="item-title">{{ a.title }}</h3>
        <p v-if="a.summary" class="item-summary">{{ a.summary }}</p>
        <div class="item-meta">
          <span class="meta-item">{{ a.category }}</span>
          <span class="meta-spacer"></span>
          <span class="meta-item">{{ fmtCount(a.views) }} 阅读</span>
          <span class="meta-item">{{ a.likes }} 赞</span>
        </div>
      </router-link>
    </div>

    <div v-else class="empty">
      <div class="empty-mark">文</div>
      <p>还没有发布过文章</p>
      <router-link to="/publish" class="btn sm">去投稿</router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api, createToast, fmtCount } from '../api.js'

export default {
  name: 'MyArticles',
  setup() {
    const list = ref([])
    const loading = ref(true)

    // 审核状态展示映射
    const statusMap = {
      published: { text: '已发布', cls: 'published' },
      pending: { text: '审核中', cls: 'pending' },
      rejected: { text: '未通过', cls: 'rejected' },
      offline: { text: '已下架', cls: 'offline' }
    }

    onMounted(async () => {
      try {
        list.value = await api.myArticles()
      } catch (e) {
        createToast(e.message || '加载失败')
      } finally {
        loading.value = false
      }
    })

    return { list, loading, statusMap, fmtCount }
  }
}
</script>

<style scoped>
.list-page { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }
.page-title { font-family: var(--font-title); font-size: 20px; margin-bottom: 14px; }
.article-list { display: flex; flex-direction: column; gap: 10px; }
.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.item-top .pin-tag {
  position: static;
  border-radius: 999px;
}
.meta-spacer { flex: 1; }
.list-status { padding: 40px 0; text-align: center; color: var(--text-3); font-size: 13px; }
</style>
