<template>
  <!-- 首页：抖音式上下滑动图文信息流（整屏沉浸，无卡片边框） -->
  <div class="feed-wrap">
    <div ref="feedEl" class="feed" @scroll.passive="onScroll">
      <!-- 每屏一篇：占据整个页面（不含顶部栏与底部菜单栏） -->
      <section v-for="(a, idx) in list" :key="a.id" class="feed-screen">
        <article class="feed-screen-content">
          <div>
            <span class="feed-cat">{{ a.category }}</span>
          </div>
          <h2 class="feed-title">{{ a.title }}</h2>
          <p class="feed-summary">{{ a.summary || '（作者暂未填写摘要，点击阅读全文查看精彩内容）' }}</p>

          <!-- 作者行（含蓝V/黄V小图标） -->
          <div class="feed-author">
            <span class="author-name">{{ a.author }}</span>
            <i v-if="a.authorVerify === 'blue'" class="v-badge blue" title="官方认证">V</i>
            <i v-else-if="a.authorVerify === 'yellow'" class="v-badge yellow" title="认证创作者">V</i>
          </div>

          <!-- 操作区：点赞 / 阅读量 / 评论数 / 阅读全文 -->
          <div class="feed-actions">
            <button class="like-btn" :class="{ liked: a.liked }" @click="toggleLike(a)">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20.5S4.8 15.9 2.4 11.3C.8 7.9 2.7 4.3 6.2 4.3c2 0 3.4 1.1 4.3 2.3l1.5 2.1 1.5-2.1c.9-1.2 2.3-2.3 4.3-2.3 3.5 0 5.4 3.6 3.8 7-2.4 4.6-9.6 9.2-9.6 9.2z" />
              </svg>
              <span>{{ fmtCount(a.likes) }}</span>
            </button>
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
            <router-link :to="`/article/${a.id}`" class="read-more">点击阅读全文</router-link>
          </div>
        </article>

        <!-- 首屏底部轻提示 -->
        <div v-if="idx === 0" class="slide-hint">
          <span class="hint-line"></span>
          <span>上滑查看更多</span>
          <span class="hint-line"></span>
        </div>
      </section>

      <!-- 到底提示 -->
      <section v-if="!loading && !errorMsg && list.length && !hasMore" class="feed-screen feed-end">
        <div class="end-text">— 已浏览全部 —</div>
      </section>

      <!-- 加载 / 容错占位 -->
      <div v-if="loading" class="feed-status">正在加载…</div>
      <div v-else-if="errorMsg" class="feed-status">{{ errorMsg }}</div>
      <div v-else-if="!list.length && !hasMore" class="feed-status">
        <div class="empty"><div class="empty-mark">无</div><p>暂无文章</p></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, createToast, fmtCount } from '../api.js'
import { store } from '../store.js'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const feedEl = ref(null)

    const all = ref([])      // 本次进入时拉取的全部文章（已随机打乱）
    const visible = ref(0)   // 当前展示的条数（上滑逐屏增加）
    const loading = ref(false)
    const errorMsg = ref('')
    let fetched = false      // 是否已完成全量拉取

    // Fisher-Yates 随机洗牌
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

    const list = computed(() => all.value.slice(0, visible.value))
    const hasMore = computed(() => visible.value < all.value.length)

    // 每次进入首页：一次性拉取全部信息流文章并随机打乱，之后上滑逐屏展示
    async function loadNext() {
      if (loading.value) return
      loading.value = true
      try {
        if (!fetched) {
          const items = []
          let page = 1
          while (true) {
            const data = await api.feed(page, 20, store.username)
            items.push(...data.list)
            if (!data.hasMore) break
            page += 1
            if (page > 50) break // 安全上限
          }
          all.value = shuffle(items) // 每次进入顺序随机
          fetched = true
          if (!items.length) errorMsg.value = '暂无文章'
        }
        visible.value = Math.min(all.value.length, visible.value + 5)
      } catch (e) {
        if (!all.value.length) errorMsg.value = e.message || '加载失败'
        else createToast(e.message || '加载失败')
      } finally {
        loading.value = false
      }
    }

    // 滚动接近底部逐屏加载
    function onScroll() {
      const el = feedEl.value
      if (!el) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) loadNext()
    }

    // 点赞 / 取消点赞（未登录跳转登录页）
    async function toggleLike(a) {
      if (!store.isLoggedIn) {
        createToast('请先登录后再点赞')
        router.push({ path: '/login', query: { redirect: '/' } })
        return
      }
      try {
        const data = await api.like(a.id)
        a.liked = data.liked
        a.likes = data.likes
      } catch (e) {
        createToast(e.message || '操作失败')
      }
    }

    onMounted(loadNext)

    return { feedEl, list, loading, errorMsg, hasMore, onScroll, toggleLike, fmtCount }
  }
}
</script>

<style scoped>
/* 外层容器：占满可视区（顶栏+底栏之间），隐藏溢出 */
.feed-wrap {
  height: calc(100vh - var(--header-h) - var(--tabbar-h));
  overflow: hidden;
  position: relative;
}
/* 内层滚动容器：纵向吸附滑动 */
.feed {
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  overscroll-behavior: contain;
}
.feed::-webkit-scrollbar { display: none; }

/* 每屏文章：整屏沉浸（不含顶栏与底栏），无卡片边框 */
.feed-screen {
  height: calc(100vh - var(--header-h) - var(--tabbar-h));
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 30px 24px 34px;
}
.feed-screen-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.feed-cat {
  display: inline-block;
  font-size: 12px;
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 2px 12px;
}
.feed-title {
  font-family: var(--font-title);
  font-size: 32px;
  line-height: 1.4;
  margin: 18px 0 0;
}
.feed-summary {
  flex: 1;
  font-size: 15.5px;
  color: var(--text-2);
  line-height: 1.95;
  margin-top: 24px;
  overflow: hidden;
}
.feed-author {
  display: flex;
  align-items: center;
  margin-top: 26px;
}
.feed-author .author-name {
  font-size: 15px;
  color: var(--text);
  font-weight: 600;
}
.feed-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  border-top: 1px dashed var(--border);
  padding-top: 16px;
  margin-top: 16px;
}
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 14px;
  transition: color .2s ease, transform .15s ease;
}
.like-btn svg { width: 20px; height: 20px; }
.like-btn:active { transform: scale(0.9); }
.like-btn.liked { color: var(--accent); }
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-3);
  font-size: 13px;
}
.meta-item svg { width: 16px; height: 16px; }
.read-more {
  margin-left: auto;
  font-size: 14px;
  color: var(--accent);
  font-family: var(--font-title);
  padding: 6px 12px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  transition: all .2s ease;
}
.read-more:hover { background: var(--accent); color: #fff; }

/* 首屏底部「上滑查看更多」提示 */
.slide-hint {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-3);
  font-size: 12px;
  animation: hint-float 1.6s ease-in-out infinite;
}
.hint-line { width: 28px; height: 1px; background: var(--text-3); opacity: .6; }
@keyframes hint-float {
  0%, 100% { transform: translateY(0); opacity: .7; }
  50% { transform: translateY(5px); opacity: 1; }
}

/* 到底提示屏 */
.feed-end { align-items: center; justify-content: center; }
.end-text { color: var(--text-3); font-size: 13px; }

.feed-status {
  padding: 30px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
