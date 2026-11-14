<template>
  <div class="detail-page">
    <!-- 顶部返回栏 -->
    <header class="detail-header">
      <button class="back-btn" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="header-title">文章详情</span>
    </header>

    <!-- 正文滚动区 -->
    <div class="detail-scroll">
      <template v-if="article">
        <article class="detail-body">
          <div class="detail-cat">{{ article.category }}</div>
          <h1 class="detail-title">{{ article.title }}</h1>

          <div class="detail-author-row">
            <span class="author-name">{{ article.author }}</span>
            <i v-if="article.authorVerify === 'blue'" class="v-badge blue" title="官方认证">V</i>
            <i v-else-if="article.authorVerify === 'yellow'" class="v-badge yellow" title="认证创作者">V</i>
            <span class="detail-time">{{ fmtTime(article.createdAt) }} · {{ fmtCount(article.views) }} 阅读</span>
          </div>

          <!-- Markdown 正文：marked 渲染 + DOMPurify 消毒 -->
          <div class="article-body" v-html="bodyHtml"></div>
        </article>

        <!-- 评论区 -->
        <section class="detail-section comments-section">
          <h3 class="section-title">评论 <em v-if="article.commentsCount">（{{ article.commentsCount }}）</em></h3>
          <div class="comment-input">
            <input
              v-model="commentText"
              class="input"
              :placeholder="store.isLoggedIn ? '写下你的评论…' : '登录后即可参与评论'"
              maxlength="500"
              @keyup.enter="submitComment"
            />
            <button class="btn primary sm" :disabled="submitting" @click="submitComment">发表</button>
          </div>

          <div v-if="comments.length" class="comment-list">
            <div v-for="c in comments" :key="c.id" class="comment-item">
              <div class="comment-head">
                <span class="comment-nick">{{ c.nickname || c.user }}</span>
                <span class="comment-time">{{ fmtTime(c.time) }}</span>
              </div>
              <p class="comment-content">{{ c.content }}</p>
            </div>
            <button v-if="cHasMore" class="load-more" :disabled="cLoading" @click="loadComments(cPage)">
              {{ cLoading ? '加载中…' : '加载更多评论' }}
            </button>
            <div v-else class="list-end">— 没有更多评论了 —</div>
          </div>
          <div v-else-if="!cLoading" class="empty">
            <div class="empty-mark">评</div>
            <p>暂无评论，来抢沙发吧</p>
          </div>
        </section>

        <!-- 相关推荐 -->
        <section v-if="related.length" class="detail-section">
          <h3 class="section-title">相关推荐</h3>
          <router-link v-for="r in related" :key="r.id" :to="`/article/${r.id}`" class="article-item related-item">
            <h4 class="item-title">{{ r.title }}</h4>
            <div class="item-meta">
              <span class="author-name">{{ r.author }}</span>
              <span class="meta-item">{{ fmtCount(r.views) }} 阅读</span>
              <span class="meta-item">{{ r.likes }} 赞</span>
            </div>
          </router-link>
        </section>

        <div class="detail-bottom-space"></div>
      </template>

      <!-- 加载 / 错误容错 -->
      <div v-else-if="loading" class="page-status">正在加载文章…</div>
      <div v-else class="page-status">
        <div class="empty"><div class="empty-mark">缺</div><p>{{ errorMsg || '文章不存在或未发布' }}</p></div>
      </div>
    </div>

    <!-- 底部操作栏：点赞 / 收藏 / 分享 -->
    <footer v-if="article" class="detail-actions">
      <button class="action-btn" :class="{ liked: article.liked }" @click="toggleLike">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20.5S4.8 15.9 2.4 11.3C.8 7.9 2.7 4.3 6.2 4.3c2 0 3.4 1.1 4.3 2.3l1.5 2.1 1.5-2.1c.9-1.2 2.3-2.3 4.3-2.3 3.5 0 5.4 3.6 3.8 7-2.4 4.6-9.6 9.2-9.6 9.2z" />
        </svg>
        <span>{{ article.likes }}</span>
      </button>
      <button class="action-btn" :class="{ favorited: favorited }" @click="toggleFavorite">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.9 6.8 19.2l1-5.9L3.5 9.2l5.9-.9L12 3z" />
        </svg>
        <span>{{ favorited ? '已收藏' : '收藏' }}</span>
      </button>
      <button class="action-btn" @click="share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        <span>分享</span>
      </button>
    </footer>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { api, createToast, fmtCount, fmtTime } from '../api.js'
import { store } from '../store.js'

export default {
  name: 'ArticleDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const id = computed(() => route.params.id)

    const article = ref(null)
    const loading = ref(true)
    const errorMsg = ref('')

    // 评论区
    const comments = ref([])
    const cPage = ref(1)
    const cHasMore = ref(false)
    const cLoading = ref(false)
    const commentText = ref('')
    const submitting = ref(false)

    // 收藏状态
    const favorited = ref(false)

    // 相关推荐
    const related = ref([])

    // 正文：marked 解析 Markdown 后再经 DOMPurify 消毒，防止 XSS
    const bodyHtml = computed(() => {
      if (!article.value || !article.value.content) return ''
      return DOMPurify.sanitize(marked.parse(article.value.content))
    })

    // 未登录时统一引导登录
    function requireLogin() {
      createToast('请先登录')
      router.push({ path: '/login', query: { redirect: route.fullPath } })
    }

    // 加载文章详情（登录时传 user 以获得 liked 状态，服务端同时记录阅读历史/发放奖励）
    async function loadDetail() {
      loading.value = true
      errorMsg.value = ''
      try {
        const data = await api.articleDetail(id.value, store.username)
        article.value = data
        document.title = `${data.title} - 观文阁`
        loadComments(1, true)
        loadRelated(data.category)
        if (store.isLoggedIn) checkFavorited()
      } catch (e) {
        errorMsg.value = e.message || '文章加载失败'
      } finally {
        loading.value = false
      }
    }

    // 分页加载评论
    async function loadComments(page = 1, reset = false) {
      if (cLoading.value) return
      cLoading.value = true
      try {
        const data = await api.comments(id.value, page, 10)
        if (reset) comments.value = data.list
        else comments.value.push(...data.list)
        cPage.value = page + 1
        cHasMore.value = data.hasMore
      } catch (e) {
        createToast(e.message || '评论加载失败')
      } finally {
        cLoading.value = false
      }
    }

    // 相关推荐：同分类下的其他文章
    async function loadRelated(category) {
      try {
        const data = await api.articles({ category, page: 1, size: 5, sort: 'recommend' })
        related.value = data.list.filter((a) => a.id !== id.value).slice(0, 4)
      } catch (e) {
        /* 静默失败，不阻塞正文阅读 */
      }
    }

    // 初始化收藏状态：查询用户收藏列表
    async function checkFavorited() {
      try {
        const list = await api.favorites()
        favorited.value = list.some((a) => a.id === id.value)
      } catch (e) {
        /* 忽略，收藏状态以本地为准 */
      }
    }

    // 点赞 / 取消点赞
    async function toggleLike() {
      if (!store.isLoggedIn) return requireLogin()
      try {
        const data = await api.like(id.value)
        article.value.liked = data.liked
        article.value.likes = data.likes
      } catch (e) {
        createToast(e.message || '操作失败')
      }
    }

    // 收藏 / 取消收藏
    async function toggleFavorite() {
      if (!store.isLoggedIn) return requireLogin()
      try {
        const data = await api.toggleFavorite(id.value)
        favorited.value = data.favorited
        createToast(data.favorited ? '已加入收藏' : '已取消收藏')
      } catch (e) {
        createToast(e.message || '操作失败')
      }
    }

    // 分享：优先系统分享，否则复制链接
    async function share() {
      const url = `${location.origin}/article/${id.value}`
      if (navigator.share) {
        try {
          await navigator.share({ title: article.value.title, url })
          return
        } catch (e) {
          /* 用户取消分享则继续走复制 */
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        createToast('链接已复制，快去分享吧')
      } catch (e) {
        createToast(url)
      }
    }

    // 发表评论
    async function submitComment() {
      if (!store.isLoggedIn) return requireLogin()
      const content = commentText.value.trim()
      if (!content) return createToast('评论内容不能为空')
      if (content.length > 500) return createToast('评论最长500字')
      submitting.value = true
      try {
        await api.addComment(id.value, content)
        commentText.value = ''
        createToast('评论成功')
        loadComments(1, true)
        if (article.value) article.value.commentsCount += 1
      } catch (e) {
        createToast(e.message || '评论失败')
      } finally {
        submitting.value = false
      }
    }

    // 返回：有历史则回退，否则回首页
    function goBack() {
      if (window.history.length > 1) router.back()
      else router.push('/')
    }

    onMounted(loadDetail)
    // 路由参数变化（相关推荐点击）时重新加载
    watch(id, loadDetail)

    return {
      store, article, loading, errorMsg, bodyHtml,
      comments, cPage, cHasMore, cLoading, commentText, submitting,
      favorited, related, loadComments, submitComment,
      toggleLike, toggleFavorite, share, goBack, fmtCount, fmtTime
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* 顶部返回栏 */
.detail-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
}
.back-btn:hover { background: var(--bg-muted); }
.back-btn svg { width: 22px; height: 22px; }
.header-title { font-size: 15px; color: var(--text-2); }

/* 滚动区 */
.detail-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 正文容器 */
.detail-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 18px 0;
}
.detail-cat {
  display: inline-block;
  font-size: 12px;
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 2px 12px;
  margin-bottom: 14px;
}
.detail-title {
  font-family: var(--font-title);
  font-size: 24px;
  line-height: 1.5;
  margin-bottom: 12px;
}
.detail-author-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 16px;
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--border);
}
.detail-author-row .author-name { font-size: 14px; font-weight: 600; }
.detail-time { margin-left: auto; font-size: 12px; color: var(--text-3); }

/* 评论区 */
.detail-section {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 18px 0;
}
.section-title {
  font-family: var(--font-title);
  font-size: 17px;
  margin-bottom: 14px;
  position: relative;
  padding-left: 12px;
}
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
}
.section-title em { font-style: normal; font-size: 13px; color: var(--text-3); font-family: var(--font-body); }

.comment-input { display: flex; gap: 10px; margin-bottom: 18px; }
.comment-input .input { flex: 1; }

.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.comment-head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.comment-nick { font-size: 13px; font-weight: 600; }
.comment-time { margin-left: auto; font-size: 12px; color: var(--text-3); }
.comment-content { font-size: 14px; line-height: 1.7; color: var(--text); word-break: break-word; }

.load-more {
  width: 100%;
  padding: 12px 0;
  text-align: center;
  color: var(--accent);
  font-size: 13px;
}
.list-end {
  padding: 14px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
}

/* 相关推荐 */
.related-item { margin-bottom: 10px; padding: 14px; }

/* 底部操作栏 */
.detail-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-2);
  height: 100%;
  transition: color .2s ease;
}
.action-btn svg { width: 20px; height: 20px; }
.action-btn.liked { color: var(--accent); }
.action-btn.favorited { color: var(--yellow-v); }

/* 页面底部留白，避免被操作栏遮挡 */
.detail-bottom-space { height: calc(var(--tabbar-h) + 30px); }

.page-status { padding: 80px 16px; }
</style>
