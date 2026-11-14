<template>
  <div class="page">
    <!-- 顶部：返回 + 标题 + 操作 -->
    <div class="page-head">
      <button class="btn btn-ghost" @click="router.back()">← 返回</button>
      <h2>用户：{{ username }}</h2>
      <div class="tools">
        <button
          v-if="banned"
          class="btn btn-success btn-sm"
          :disabled="loading"
          @click="toggleBan"
        >解封</button>
        <button
          v-else
          class="btn btn-ghost-danger btn-sm"
          :disabled="loading"
          @click="toggleBan"
        >封禁</button>
        <button
          v-if="isBlue"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="doVerify('blue', 'revoke')"
        >撤销蓝V</button>
        <button
          v-else
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="doVerify('blue', 'grant')"
        >授予蓝V</button>
        <button
          v-if="isYellow"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="doVerify('yellow', 'revoke')"
        >撤销黄V</button>
        <button
          v-else
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="doVerify('yellow', 'grant')"
        >授予黄V</button>
      </div>
    </div>

    <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
    <template v-else-if="detail">
      <!-- 资料 + 成长 -->
      <div class="detail-grid" style="margin-bottom: 16px">
        <div class="card">
          <div class="card-title">基本资料</div>
          <div class="kv-list">
            <div class="kv-item"><span class="kv-key">昵称</span><span class="kv-val">{{ profile.nickname || '—' }}</span></div>
            <div class="kv-item"><span class="kv-key">认证</span><span class="kv-val">
              <span v-if="isBlue" class="badge badge-v-blue">蓝V</span>
              <span v-if="isYellow" class="badge badge-v-yellow">黄V</span>
              <span v-if="verify.pending" class="badge badge-warn">黄V申请中</span>
              <span v-if="!isBlue && !isYellow && !verify.pending" class="badge badge-gray">无</span>
            </span></div>
            <div class="kv-item" style="width: 100%">
              <span class="kv-key">简介</span>
              <span class="kv-val">{{ profile.bio || '—' }}</span>
            </div>
          </div>
          <div class="form-item" style="margin-top: 12px">
            <label class="form-label">头像 URL</label>
            <p class="form-hint" style="word-break: break-all">{{ profile.avatar || '（未设置头像）' }}</p>
          </div>
        </div>
        <div class="card">
          <div class="card-title">成长数据</div>
          <div class="kv-list">
            <div class="kv-item"><span class="kv-key">等级</span><span class="kv-val">Lv.{{ growth.level }}</span></div>
            <div class="kv-item"><span class="kv-key">经验</span><span class="kv-val">{{ growth.exp }}</span></div>
            <div class="kv-item"><span class="kv-key">金币</span><span class="kv-val">{{ growth.coins }}</span></div>
            <div class="kv-item"><span class="kv-key">阅读</span><span class="kv-val">{{ growth.readCount }}</span></div>
            <div class="kv-item"><span class="kv-key">评论</span><span class="kv-val">{{ growth.commentCount }}</span></div>
            <div class="kv-item"><span class="kv-key">发布</span><span class="kv-val">{{ growth.publishCount }}</span></div>
          </div>
        </div>
      </div>

      <!-- 收藏 + 历史 -->
      <div class="detail-grid" style="margin-bottom: 16px">
        <div class="card">
          <div class="card-title">收藏列表（{{ favorites.length }}）</div>
          <ul v-if="favorites.length" class="slim-list">
            <li v-for="(fav, i) in favorites" :key="i">
              <span>{{ titleOf(fav) }}</span>
            </li>
          </ul>
          <div v-else class="empty">暂无收藏</div>
        </div>
        <div class="card">
          <div class="card-title">历史记录（前50条）</div>
          <ul v-if="history.length" class="slim-list">
            <li v-for="(h, i) in history" :key="i">
              <span class="td-ellipsis" :title="h.title">{{ h.title }}</span>
              <span class="time">{{ h.time }}</span>
            </li>
          </ul>
          <div v-else class="empty">暂无历史记录</div>
        </div>
      </div>

      <!-- 评论 + 发表文章 -->
      <div class="detail-grid" style="margin-bottom: 16px">
        <div class="card">
          <div class="card-title">评论记录（前100条）</div>
          <ul v-if="comments.length" class="slim-list">
            <li v-for="(c, i) in comments" :key="i">
              <span class="td-ellipsis" :title="`${c.articleTitle} —— ${c.content}`">
                「{{ c.articleTitle || c.articleId }}」{{ c.content }}
              </span>
              <span class="time">{{ c.time }}</span>
            </li>
          </ul>
          <div v-else class="empty">暂无评论</div>
        </div>
        <div class="card">
          <div class="card-title">发表文章（{{ articles.length }}）</div>
          <ul v-if="articles.length" class="slim-list">
            <li v-for="a in articles" :key="a.id">
              <span class="td-ellipsis" style="cursor: pointer" :title="a.title" @click="showArticle(a)">{{ a.title }}</span>
              <span class="time">{{ a.createdAt }}</span>
            </li>
          </ul>
          <div v-else class="empty">暂无发表文章</div>
        </div>
      </div>

      <!-- 用户文件夹目录 -->
      <div class="card">
        <div class="card-title">用户文件夹目录</div>
        <div v-if="fileTree.length" class="table-wrap">
          <TreeNode v-for="node in fileTree" :key="node.name" :node="node" :depth="0" />
        </div>
        <div v-else class="empty">文件夹为空</div>
      </div>
    </template>
    <div v-else class="card"><div class="empty">未找到该用户</div></div>

    <!-- 文章预览弹窗 -->
    <div v-if="articleModal.visible" class="modal-mask" @click.self="articleModal.visible = false">
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">文章预览</span>
          <button class="modal-close" type="button" @click="articleModal.visible = false">×</button>
        </div>
        <div class="modal-body">
          <h3 style="margin-bottom: 6px">{{ articleModal.article.title }}</h3>
          <p class="form-hint">分类：{{ articleModal.article.category }}　作者：{{ articleModal.article.author }}　状态：{{ articleModal.article.status }}</p>
          <p v-if="articleModal.article.summary" class="form-hint" style="margin-top: 6px">摘要：{{ articleModal.article.summary }}</p>
          <div class="md-preview" style="margin-top: 10px" v-html="articlePreviewHtml"></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="articleModal.visible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * UserDetail.vue —— 用户文件夹详情
 * 展示资料、成长、收藏、历史、评论、发表文章，以及文件目录树；支持封禁/解封与 V 认证操作。
 */
import { ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getUserDetail,
  getUsers,
  getArticles,
  banUser,
  unbanUser,
  verifyUser,
  showToast,
} from '../api'

const route = useRoute()
const router = useRouter()

const username = String(route.params.username || '')
const loading = ref(false)
const detail = ref(null)

// 用户封禁状态（详情接口不返回 status，从用户列表接口补充）
const banned = ref(false)

// 文章标题映射（收藏只有文章 ID，需要反查标题）
const titleMap = ref({})

/* ---------- 计算属性 ---------- */
const profile = computed(() => detail.value.profile || {})
const verify = computed(() => profile.value.verify || {})
const isBlue = computed(() => !!verify.value.blue)
const isYellow = computed(() => !!verify.value.yellow)
const growth = computed(() => detail.value.growth || {})
const favorites = computed(() => (Array.isArray(detail.value.favorites) ? detail.value.favorites : []))
const history = computed(() => (Array.isArray(detail.value.history) ? detail.value.history : []))
const comments = computed(() => (Array.isArray(detail.value.comments) ? detail.value.comments : []))
const articles = computed(() => (Array.isArray(detail.value.articles) ? detail.value.articles : []))
const fileTree = computed(() => (Array.isArray(detail.value.fileTree) ? detail.value.fileTree : []))

// 收藏项可能是 {articleId} 或纯 ID 字符串，统一转标题
function titleOf(fav) {
  if (typeof fav === 'string') return titleMap.value[fav] || fav
  const id = fav.articleId || fav.id
  return titleMap.value[id] || fav.title || id || JSON.stringify(fav)
}

async function loadDetail() {
  loading.value = true
  try {
    const [data, users, allArticles] = await Promise.all([
      getUserDetail(username),
      getUsers(),
      getArticles(''),
    ])
    detail.value = data
    // 同步封禁状态
    const hit = users.find((u) => u.username === username)
    banned.value = !!(hit && hit.status === 'banned')
    // 构建文章标题映射
    const map = {}
    allArticles.forEach((a) => {
      map[a.id] = a.title
    })
    titleMap.value = map
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

/* ---------- 封禁 / 解封 ---------- */
async function toggleBan() {
  const tip = banned.value ? `确定解封「${username}」吗？` : `确定封禁「${username}」吗？封禁后无法登录。`
  if (!window.confirm(tip)) return
  try {
    if (banned.value) await unbanUser(username)
    else await banUser(username)
    banned.value = !banned.value
    showToast(banned.value ? '已封禁' : '已解封')
  } catch (e) {
    showToast(e.message, 'error')
  }
}

/* ---------- 蓝V / 黄V 认证 ---------- */
async function doVerify(type, action) {
  const typeText = type === 'blue' ? '蓝V' : '黄V'
  const actionText = action === 'grant' ? '授予' : '撤销'
  if (!window.confirm(`确定${actionText}「${username}」的${typeText}认证吗？`)) return
  try {
    await verifyUser(username, type, action)
    showToast(`${typeText}${actionText}成功`)
    loadDetail()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

/* ---------- 文章预览 ---------- */
const articleModal = ref({ visible: false, article: null })

function showArticle(article) {
  articleModal.value = { visible: true, article }
}

// 简单 Markdown 渲染（文章正文前200字预览）
function simpleMarkdown(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      if (/^###\s+/.test(t)) return `<h3>${line.replace(/^###\s+/, '')}</h3>`
      if (/^##\s+/.test(t)) return `<h2>${line.replace(/^##\s+/, '')}</h2>`
      if (/^#\s+/.test(t)) return `<h1>${line.replace(/^#\s+/, '')}</h1>`
      if (/^[-*]\s+/.test(t)) return `<li>${line.replace(/^[-*]\s+/, '')}</li>`
      return `<p>${line}</p>`
    })
    .join('')
}

const articlePreviewHtml = computed(() =>
  articleModal.value.article ? simpleMarkdown(articleModal.value.article.content || articleModal.value.article.summary || '') : ''
)

/* ---------- 文件树递归组件 ---------- */
function formatSize(size) {
  if (size === undefined || size === null) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

const TreeNode = {
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 },
  },
  setup(props) {
    // 目录默认展开，可点击收起/展开
    const open = ref(true)
    return () => {
      const node = props.node
      const isDir = node.type === 'dir'
      const children = isDir && Array.isArray(node.children) ? node.children : []
      return h('div', { class: 'tree-node' }, [
        h(
          'div',
          {
            class: 'tree-row',
            style: { paddingLeft: `${props.depth * 18}px` },
            onClick: () => {
              if (isDir) open.value = !open.value
            },
          },
          [
            h('span', { class: 'tree-toggle' }, isDir ? (open.value ? '▾' : '▸') : ''),
            h('span', { class: isDir ? 'tree-name tree-name-dir' : 'tree-name' }, node.name),
            h(
              'span',
              { class: 'tree-size' },
              isDir ? `${children.length} 项` : formatSize(node.size)
            ),
          ]
        ),
        isDir && open.value && children.length
          ? h(
              'div',
              { class: 'tree-children' },
              children.map((c) => h(TreeNode, { node: c, depth: props.depth + 1 }))
            )
          : null,
      ])
    }
  },
}

onMounted(loadDetail)
</script>
