<template>
  <div class="discover">
    <!-- 搜索框 -->
    <div class="search-bar card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        v-model.trim="keyword"
        type="search"
        placeholder="搜索文章、作者…"
        @keyup.enter="reload"
      />
      <button v-if="keyword" class="clear-btn" aria-label="清空" @click="clearSearch">×</button>
    </div>

    <!-- 分类横滑 chips（含「全部」） -->
    <div class="chips">
      <button class="chip" :class="{ active: category === '全部' }" @click="pickCategory('全部')">全部</button>
      <button
        v-for="c in cats"
        :key="c.name"
        class="chip"
        :class="{ active: category === c.name }"
        @click="pickCategory(c.name)"
      >
        {{ c.name }}<em>{{ c.count }}</em>
      </button>
    </div>

    <!-- 文章列表（每次进入/筛选时随机排序） -->
    <div class="article-list">
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
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {{ fmtCount(a.views) }}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3-.4-4.2-1.1L3 20l1.1-5.3A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            {{ a.commentsCount }}
          </span>
        </div>
      </router-link>
    </div>

    <!-- 状态区：加载 / 空 / 到底 -->
    <div v-if="loading" class="list-status">正在加载…</div>
    <div v-else-if="!list.length" class="empty">
      <div class="empty-mark">无</div>
      <p>暂无文章</p>
    </div>
    <div v-else-if="!hasMore" class="list-status">— 已经到底啦 —</div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api, createToast, fmtCount } from '../api.js'

export default {
  name: 'Discover',
  setup() {
    const keyword = ref('')
    const category = ref('全部')
    const cats = ref([])

    const all = ref([])      // 当前筛选下的全部文章（已随机打乱）
    const visible = ref(0)   // 当前展示条数（滚动逐步增加）
    const loading = ref(false)

    const list = computed(() => all.value.slice(0, visible.value))
    const hasMore = computed(() => visible.value < all.value.length)

    // Fisher-Yates 随机洗牌
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

    // 拉取分类列表
    async function fetchCats() {
      try {
        cats.value = await api.categories()
      } catch (e) {
        /* 分类加载失败不阻塞列表 */
      }
    }

    // 一次性拉取当前筛选下的全部文章并随机打乱，滚动时本地分页展示
    async function fetchList() {
      if (loading.value) return
      loading.value = true
      try {
        const items = []
        let page = 1
        while (true) {
          const data = await api.articles({
            page,
            size: 50,
            category: category.value === '全部' ? '' : category.value,
            keyword: keyword.value
          })
          items.push(...data.list)
          if (!data.hasMore) break
          page += 1
          if (page > 50) break // 安全上限
        }
        all.value = shuffle(items) // 每次进入/筛选顺序随机
        visible.value = Math.min(items.length, 10)
      } catch (e) {
        createToast(e.message || '加载失败')
      } finally {
        loading.value = false
      }
    }

    // 条件变化后重置并重新加载
    function reload() {
      all.value = []
      visible.value = 0
      fetchList()
    }

    function pickCategory(name) {
      category.value = name
      reload()
    }

    function clearSearch() {
      keyword.value = ''
      reload()
    }

    // 滚动接近底部继续展示更多（本地分页）
    function onScroll() {
      if (hasMore.value && !loading.value) {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
          visible.value = Math.min(all.value.length, visible.value + 10)
        }
      }
    }

    onMounted(() => {
      fetchCats()
      fetchList()
      window.addEventListener('scroll', onScroll)
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', onScroll)
    })

    return { keyword, category, cats, list, loading, hasMore, reload, pickCategory, clearSearch, fmtCount }
  }
}
</script>

<style scoped>
.discover { max-width: 720px; margin: 0 auto; padding: 12px 14px 24px; }

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 42px;
  margin-bottom: 12px;
  border-radius: 8px;
}
.search-bar svg { width: 18px; height: 18px; color: var(--text-3); flex: none; }
.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
}
.clear-btn { color: var(--text-3); font-size: 18px; padding: 0 4px; }

/* 文章列表 */
.article-list { display: flex; flex-direction: column; gap: 10px; }
.meta-spacer { flex: 1; }

.list-status {
  padding: 24px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
