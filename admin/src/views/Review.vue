<template>
  <div class="page">
    <!-- Tab 切换 -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'article' }" @click="switchTab('article')">
        投稿审核
      </button>
      <button class="tab" :class="{ active: activeTab === 'verify' }" @click="switchTab('verify')">
        黄V申请
      </button>
      <button class="tab" :class="{ active: activeTab === 'comment' }" @click="switchTab('comment')">
        评论审核
      </button>
    </div>

    <!-- ============ 投稿审核 ============ -->
    <div v-if="activeTab === 'article'">
      <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
      <div v-else-if="pendingArticles.length" class="card" style="padding: 0">
        <div style="padding: 14px 16px 0">
          <span class="card-title" style="display: block; margin-bottom: 0">待审核投稿（{{ pendingArticles.length }}）</span>
        </div>
        <div style="padding: 14px 16px">
          <div v-for="article in pendingArticles" :key="article.id" class="review-card" style="margin-bottom: 12px">
            <div class="review-card-head">
              <div>
                <div class="review-card-title">{{ article.title }}</div>
                <div class="review-card-meta">
                  作者：{{ article.author }}　分类：{{ article.category }}　时间：{{ article.createdAt }}
                </div>
              </div>
              <div class="ops">
                <button class="btn btn-danger btn-sm" :disabled="actingId === article.id" @click="doReview(article, 'reject')">驳回</button>
                <button class="btn btn-success btn-sm" :disabled="actingId === article.id" @click="doReview(article, 'approve')">通过</button>
              </div>
            </div>
            <div class="review-card-content">{{ article.content || article.summary || '（无正文预览）' }}</div>
          </div>
        </div>
      </div>
      <div v-else class="card"><div class="empty">暂无待审核投稿</div></div>
    </div>

    <!-- ============ 黄V申请 ============ -->
    <div v-if="activeTab === 'verify'">
      <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
      <div v-else-if="pendingApplications.length" class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>申请人</th>
                <th>申请时间</th>
                <th style="min-width: 160px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in pendingApplications" :key="app.username">
                <td><strong>{{ app.username }}</strong></td>
                <td>{{ app.time }}</td>
                <td>
                  <div class="ops">
                    <button class="btn btn-danger btn-sm" :disabled="actingId === app.username" @click="doApplication(app, 'reject')">驳回</button>
                    <button class="btn btn-success btn-sm" :disabled="actingId === app.username" @click="doApplication(app, 'approve')">通过（授黄V）</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="card"><div class="empty">暂无待处理的黄V申请</div></div>
    </div>

    <!-- ============ 评论审核 ============ -->
    <div v-if="activeTab === 'comment'">
      <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
      <div v-else-if="comments.length" class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width: 200px">文章</th>
                <th>用户</th>
                <th>内容</th>
                <th>时间</th>
                <th style="width: 90px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="comment in comments" :key="comment.id">
                <td class="td-ellipsis" :title="comment.articleTitle || comment.articleId">
                  {{ comment.articleTitle || comment.articleId }}
                </td>
                <td>{{ comment.nickname || comment.user || '—' }}</td>
                <td class="td-ellipsis" :title="comment.content">{{ comment.content }}</td>
                <td>{{ comment.time }}</td>
                <td>
                  <button class="btn btn-ghost-danger btn-sm" :disabled="actingId === comment.id" @click="removeComment(comment)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="card"><div class="empty">暂无评论数据</div></div>
    </div>
  </div>
</template>

<script setup>
/**
 * Review.vue —— 内容审核
 * 三个 Tab：投稿审核（通过/驳回）、黄V申请（通过授黄V/驳回）、评论审核（删除违规评论）。
 */
import { ref, computed, onMounted } from 'vue'
import {
  getArticles,
  reviewArticle,
  getApplications,
  reviewApplication,
  getComments,
  deleteComment,
  showToast,
} from '../api'

const activeTab = ref('article')
const loading = ref(false)
const actingId = ref('') // 正在操作中的行 ID（禁用按钮防重复点击）

/* ---------- 投稿审核 ---------- */
const articles = ref([])
const pendingArticles = computed(() =>
  articles.value.filter((a) => a.status === 'pending')
)

async function loadArticles() {
  loading.value = true
  try {
    articles.value = await getArticles('')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function doReview(article, action) {
  if (!window.confirm(`确定${action === 'approve' ? '通过' : '驳回'}投稿「${article.title}」吗？`)) return
  actingId.value = article.id
  try {
    await reviewArticle(article.id, action)
    showToast(action === 'approve' ? '已通过' : '已驳回')
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    actingId.value = ''
  }
}

/* ---------- 黄V申请 ---------- */
const applications = ref([])
const pendingApplications = computed(() =>
  applications.value.filter((a) => a.status === 'pending')
)

async function loadApplications() {
  loading.value = true
  try {
    applications.value = await getApplications()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function doApplication(app, action) {
  const tip = action === 'approve'
    ? `确定通过「${app.username}」的黄V申请（授予黄V）吗？`
    : `确定驳回「${app.username}」的黄V申请吗？`
  if (!window.confirm(tip)) return
  actingId.value = app.username
  try {
    await reviewApplication(app.username, action)
    showToast(action === 'approve' ? '已通过，授予黄V' : '已驳回')
    loadApplications()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    actingId.value = ''
  }
}

/* ---------- 评论审核 ---------- */
const comments = ref([])

async function loadComments() {
  loading.value = true
  try {
    const list = await getComments()
    // 只展示有效评论（已删除的不展示）
    comments.value = list.filter((c) => c.status !== 'removed')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function removeComment(comment) {
  if (!window.confirm('确定删除该评论吗？删除后用户端不再显示。')) return
  actingId.value = comment.id
  try {
    await deleteComment(comment.id)
    showToast('删除成功')
    loadComments()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    actingId.value = ''
  }
}

/* ---------- Tab 切换（懒加载） ---------- */
const loaders = {
  article: loadArticles,
  verify: loadApplications,
  comment: loadComments,
}

function switchTab(tab) {
  activeTab.value = tab
  loaders[tab]()
}

onMounted(() => loaders[activeTab.value]())
</script>
