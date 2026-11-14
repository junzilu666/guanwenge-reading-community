<template>
  <div class="list-page">
    <h2 class="page-title">我的收藏</h2>

    <div v-if="loading" class="list-status">正在加载…</div>

    <div v-else-if="list.length" class="article-list">
      <router-link v-for="a in list" :key="a.id" :to="`/article/${a.id}`" class="article-item">
        <span v-if="a.pinned" class="pin-tag">置顶</span>
        <h3 class="item-title">{{ a.title }}</h3>
        <p v-if="a.summary" class="item-summary">{{ a.summary }}</p>
        <div class="item-meta">
          <span class="author-name">
            {{ a.author }}
            <i v-if="a.authorVerify === 'blue'" class="v-badge blue" title="官方认证">V</i>
            <i v-else-if="a.authorVerify === 'yellow'" class="v-badge yellow" title="认证创作者">V</i>
          </span>
          <span class="meta-item">{{ a.category }}</span>
          <span class="meta-spacer"></span>
          <span class="meta-item">{{ fmtCount(a.views) }} 阅读</span>
          <span class="meta-item">{{ a.likes }} 赞</span>
        </div>
      </router-link>
    </div>

    <div v-else class="empty">
      <div class="empty-mark">藏</div>
      <p>还没有收藏任何文章</p>
      <router-link to="/discover" class="btn sm">去发现好文</router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api, createToast, fmtCount } from '../api.js'

export default {
  name: 'Favorites',
  setup() {
    const list = ref([])
    const loading = ref(true)

    onMounted(async () => {
      try {
        list.value = await api.favorites()
      } catch (e) {
        createToast(e.message || '加载失败')
      } finally {
        loading.value = false
      }
    })

    return { list, loading, fmtCount }
  }
}
</script>

<style scoped>
.list-page { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }
.page-title { font-family: var(--font-title); font-size: 20px; margin-bottom: 14px; }
.article-list { display: flex; flex-direction: column; gap: 10px; }
.meta-spacer { flex: 1; }
.list-status { padding: 40px 0; text-align: center; color: var(--text-3); font-size: 13px; }
</style>
