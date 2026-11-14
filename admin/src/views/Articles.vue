<template>
  <div class="page">
    <!-- 工具行：搜索 + 操作按钮 -->
    <div class="toolbar">
      <input
        v-model.trim="keyword"
        class="input"
        type="text"
        placeholder="按标题 / 作者 / 分类搜索"
        @keyup.enter="loadArticles"
      />
      <button class="btn btn-ghost" :disabled="loading" @click="loadArticles">搜索</button>
      <div class="spacer"></div>
      <button class="btn btn-primary" @click="openCreate">上传文章</button>
      <button class="btn btn-info" @click="openImport">批量导入</button>
      <button class="btn btn-ghost" :disabled="loading" @click="loadArticles">刷新</button>
    </div>

    <!-- 文章表格 -->
    <div class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>分类</th>
              <th>作者</th>
              <th>状态</th>
              <th>置顶</th>
              <th>阅读</th>
              <th>点赞</th>
              <th>评论</th>
              <th>时间</th>
              <th style="min-width: 220px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="loading-tip">加载中…</td>
            </tr>
            <tr v-else-if="!articles.length">
              <td colspan="11" class="empty">暂无文章数据</td>
            </tr>
            <tr v-for="article in articles" :key="article.id">
              <td>{{ article.id }}</td>
              <td class="td-title" :title="article.title">{{ article.title }}</td>
              <td><span class="badge badge-info">{{ article.category }}</span></td>
              <td>
                {{ article.author }}
                <span v-if="article.authorVerify === 'blue'" class="badge badge-v-blue">蓝V</span>
              </td>
              <td>
                <span class="badge" :class="statusMap[article.status].cls">
                  {{ statusMap[article.status].text }}
                </span>
              </td>
              <td>
                <span v-if="article.pinned" class="badge badge-warn">置顶</span>
                <span v-else class="badge badge-gray">否</span>
              </td>
              <td>{{ article.views }}</td>
              <td>{{ article.likes }}</td>
              <td>{{ article.commentsCount }}</td>
              <td>{{ article.createdAt }}</td>
              <td>
                <div class="ops">
                  <!-- 待审核：显示审核入口 -->
                  <template v-if="article.status === 'pending'">
                    <button class="btn btn-success btn-sm" @click="openReview(article)">审核</button>
                  </template>
                  <!-- 非已发布状态：可上架 -->
                  <template v-else>
                    <button
                      v-if="article.status !== 'published'"
                      class="btn btn-success btn-sm"
                      @click="changeStatus(article, 'published')"
                    >上架</button>
                    <button
                      v-else
                      class="btn btn-ghost btn-sm"
                      @click="changeStatus(article, 'offline')"
                    >下架</button>
                  </template>
                  <!-- 置顶 / 取消置顶 -->
                  <button
                    v-if="article.status === 'published' || article.status === 'offline'"
                    class="btn btn-ghost btn-sm"
                    @click="togglePin(article)"
                  >{{ article.pinned ? '取消置顶' : '置顶' }}</button>
                  <!-- 编辑 / 删除 -->
                  <button class="btn btn-ghost btn-sm" @click="openEdit(article)">编辑</button>
                  <button class="btn btn-ghost-danger btn-sm" @click="handleDelete(article)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上传 / 编辑文章弹窗 -->
    <div v-if="formModal.visible" class="modal-mask" @click.self="closeFormModal">
      <div class="modal modal-lg">
        <div class="modal-head">
          <span class="modal-title">{{ formModal.mode === 'create' ? '上传文章' : '编辑文章' }}</span>
          <button class="modal-close" type="button" @click="closeFormModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 编辑 / 预览切换 -->
          <div class="form-item">
            <div class="tabs">
              <button class="tab" :class="{ active: previewTab === 'write' }" @click="previewTab = 'write'">编辑</button>
              <button class="tab" :class="{ active: previewTab === 'preview' }" @click="previewTab = 'preview'">预览</button>
            </div>
          </div>

          <!-- 编辑模式：填写表单 -->
          <div v-if="previewTab === 'write'">
            <div class="form-item">
              <label class="form-label">标题<span class="req">*</span></label>
              <input v-model.trim="form.title" class="input" type="text" placeholder="请输入文章标题" />
            </div>
            <div class="form-item" style="display: flex; gap: 12px">
              <!-- 作者：带搜索 + 记忆排序的下拉（发布 / 编辑通用） -->
              <div style="flex: 1; position: relative">
                <label class="form-label">作者（可搜索，按最近使用排序）</label>
                <div class="select-box" :class="{ open: authorOpen }" @click="toggleAuthor">
                  <span class="select-value">{{ authorSel.label }}</span>
                  <span class="select-caret">▾</span>
                </div>
                <div v-if="authorOpen" class="select-mask" @click="authorOpen = false"></div>
                <div v-if="authorOpen" class="select-panel">
                  <input
                    v-model.trim="authorSearch"
                    class="input select-search"
                    type="text"
                    placeholder="搜索作者（昵称/用户名）…"
                    @click.stop
                  />
                  <div class="select-list">
                    <div
                      v-for="o in filteredAuthors"
                      :key="o.key"
                      class="select-option"
                      :class="{ active: authorSel.key === o.key }"
                      @click="pickAuthor(o)"
                    >
                      {{ o.label }}
                      <em v-if="o.username && o.username !== '__custom'" class="select-sub">{{ o.username }}</em>
                    </div>
                    <div v-if="!filteredAuthors.length" class="select-empty">未找到匹配作者</div>
                  </div>
                </div>
                <!-- 选择「自定义作者」时显示手动输入框 -->
                <div v-if="authorSel.username === '__custom'" style="margin-top: 8px">
                  <input v-model.trim="customAuthor" class="input" type="text" placeholder="输入自定义作者名（如：鲁迅）" />
                </div>
              </div>
              <div style="flex: 1; position: relative">
                <label class="form-label">分类（点选标签或新建）</label>
                <!-- 关闭态：以标签形式展示当前分类 -->
                <div class="tag-box" :class="{ open: catOpen }" @click="toggleCat">
                  <span v-if="form.category" class="tag-chip active">
                    {{ form.category }}
                    <i class="tag-x" title="清除分类" @click.stop="clearCategory">×</i>
                  </span>
                  <span v-else class="tag-placeholder">选择 / 新建分类</span>
                  <span class="select-caret">▾</span>
                </div>
                <!-- 展开态：搜索 + 标签云（微信编辑标签样式） -->
                <div v-if="catOpen" class="select-mask" @click="catOpen = false"></div>
                <div v-if="catOpen" class="select-panel">
                  <input
                    v-model.trim="catSearch"
                    class="input select-search"
                    type="text"
                    placeholder="搜索分类，没找到就回车新建…"
                    @click.stop
                    @keyup.enter="createCategory"
                  />
                  <div class="tag-cloud">
                    <span
                      v-for="c in visibleCategories"
                      :key="c.name"
                      class="tag-chip pick"
                      :class="{ active: form.category === c.name }"
                      @click="pickCategory(c.name)"
                    >
                      {{ c.name }}<em v-if="c.count" class="tag-count">{{ c.count }}篇</em>
                    </span>
                    <span v-if="newCategoryTip" class="tag-chip create" @click="createCategory">
                      ＋ 新建「{{ catSearch }}」
                    </span>
                  </div>
                  <div v-if="!visibleCategories.length && !newCategoryTip" class="select-empty">
                    暂无分类，输入名称后回车新建
                  </div>
                </div>
              </div>
            </div>
            <div class="form-item">
              <label class="form-label">封面 URL</label>
              <input v-model.trim="form.cover" class="input" type="text" placeholder="https://…（可留空）" />
            </div>
            <div class="form-item">
              <label class="form-label">摘要</label>
              <textarea v-model.trim="form.summary" class="textarea" rows="2" placeholder="文章摘要（可留空，自动截取正文）"></textarea>
            </div>
            <div class="form-item">
              <label class="form-label">
                正文（Markdown）<span class="req">*</span>
                <span v-if="formModal.mode === 'edit'" class="form-hint">修改后将覆盖全文（列表仅展示前200字预览）</span>
              </label>
              <textarea v-model="form.content" class="textarea" rows="10" placeholder="支持 Markdown 语法，如 # 标题、**加粗**"></textarea>
            </div>
          </div>

          <!-- 预览模式：简单 Markdown 渲染 -->
          <div v-else class="form-item">
            <div class="md-preview" v-html="renderedPreview"></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeFormModal">取消</button>
          <button class="btn btn-primary" :disabled="formModal.saving" @click="submitForm">
            {{ formModal.saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 审核弹窗 -->
    <div v-if="reviewModal.visible" class="modal-mask" @click.self="reviewModal.visible = false">
      <div class="modal modal-sm">
        <div class="modal-head">
          <span class="modal-title">审核投稿</span>
          <button class="modal-close" type="button" @click="reviewModal.visible = false">×</button>
        </div>
        <div class="modal-body">
          <p><strong>{{ reviewModal.target.title }}</strong></p>
          <p class="form-hint">作者：{{ reviewModal.target.author }}　时间：{{ reviewModal.target.createdAt }}</p>
          <p class="form-hint" style="margin-top: 8px">
            {{ (reviewModal.target.content || '').slice(0, 120) }}…
          </p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-danger" :disabled="reviewModal.saving" @click="doReview('reject')">驳回</button>
          <button class="btn btn-success" :disabled="reviewModal.saving" @click="doReview('approve')">通过</button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="importModal.visible" class="modal-mask" @click.self="importModal.visible = false">
      <div class="modal">
        <div class="modal-head">
          <span class="modal-title">批量导入</span>
          <button class="modal-close" type="button" @click="importModal.visible = false">×</button>
        </div>
        <div class="modal-body">
          <p class="form-hint" style="margin-bottom: 10px">
            将扫描后端 server/imports 目录下的 .md 文件，导入后自动发布并删除源文件。
          </p>
          <div v-if="importModal.loading" class="loading-tip">加载中…</div>
          <div v-else-if="importList.length" class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>标题</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in importList" :key="item.file">
                  <td>{{ item.file }}</td>
                  <td>{{ item.title }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty">暂无待导入文件（server/imports 目录为空）</div>
          <!-- 导入结果展示 -->
          <div v-if="importResult" class="form-item" style="margin-top: 12px">
            <p class="form-hint">
              导入完成：成功 <strong style="color: var(--success)">{{ importResult.imported }}</strong> 篇，
              <template v-if="importResult.failed.length">
                失败 <strong style="color: var(--danger)">{{ importResult.failed.length }}</strong> 篇（{{ importResult.failed.join('、') }}）
              </template>
              <template v-else>无失败</template>
            </p>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="importModal.visible = false">关闭</button>
          <button class="btn btn-info" :disabled="importModal.importing || !importList.length" @click="doImport">
            {{ importModal.importing ? '导入中…' : '执行导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Articles.vue —— 内容管理
 * 文章列表 + 搜索；上传 / 编辑弹窗（含 Markdown 实时预览）；批量导入；审核、置顶、上下架、删除。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getArticles,
  publishArticle,
  updateArticle,
  deleteArticle,
  reviewArticle,
  getImportList,
  getUsers,
  getCategories,
  runImport,
  showToast,
} from '../api'

/* ---------- 状态映射 ---------- */
const statusMap = {
  published: { text: '已发布', cls: 'badge-success' },
  pending: { text: '待审核', cls: 'badge-warn' },
  offline: { text: '已下架', cls: 'badge-info' },
  rejected: { text: '未通过', cls: 'badge-danger' },
}

/* ---------- 列表数据 ---------- */
const articles = ref([])
const keyword = ref('')
const loading = ref(false)

async function loadArticles() {
  loading.value = true
  try {
    articles.value = await getArticles(keyword.value)
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

/* ---------- 上传 / 编辑弹窗 ---------- */
const previewTab = ref('write') // 'write' 编辑 | 'preview' 预览
const formModal = reactive({
  visible: false,
  mode: 'create', // 'create' 上传 | 'edit' 编辑
  saving: false,
})
const form = reactive({
  id: null,
  title: '',
  author: '',
  category: '',
  cover: '',
  summary: '',
  content: '',
})

function resetForm() {
  form.id = null
  form.title = ''
  form.author = ''
  form.category = ''
  form.cover = ''
  form.summary = ''
  form.content = ''
  previewTab.value = 'write'
}

/* ---------- 作者选择：带搜索 + 记忆排序的下拉（发布 / 编辑通用） ---------- */
// 选项结构：{ key, label, username, name }；name 为不带 V 标的干净署名
const userOptions = ref([]) // [{ key, label, username, name }]，首项为官方编辑部，末项为自定义
const authorSel = ref({ key: '__official', label: '观文阁编辑部（官方蓝V）', username: '', name: '观文阁编辑部' })
const customAuthor = ref('') // 「自定义作者」手动输入的名字
const authorSearch = ref('')
const authorOpen = ref(false)

// 记忆排序：localStorage 记录最近选过的作者（username，官方为 ''），最近的排最前
const AUTHOR_HISTORY_KEY = 'gwg_admin_author_history'
const authorHistory = ref([])
try { authorHistory.value = JSON.parse(localStorage.getItem(AUTHOR_HISTORY_KEY)) || [] } catch (e) { authorHistory.value = [] }

function rememberAuthor(username) {
  // 自定义输入不记忆具体条目（名字不固定），仅记忆注册用户与官方
  if (username === '__custom') return
  const list = authorHistory.value.filter((u) => u !== username)
  list.unshift(username)
  authorHistory.value = list.slice(0, 10) // 最多记住 10 个
  try { localStorage.setItem(AUTHOR_HISTORY_KEY, JSON.stringify(authorHistory.value)) } catch (e) { /* 忽略存储失败 */ }
}

// 按记忆排序后的选项：最近用过的作者在前（第一个 = 上次选的，第二个 = 上上次），其余按默认顺序
const sortedAuthorOptions = computed(() => {
  const opts = [...userOptions.value]
  const customOpt = opts.find((o) => o.username === '__custom')
  const rest = opts.filter((o) => o.username !== '__custom')
  const byUsername = new Map(rest.map((o) => [o.username, o]))
  const used = []
  for (const u of authorHistory.value) {
    const o = byUsername.get(u)
    if (o) { used.push(o); byUsername.delete(u) }
  }
  const unused = [...byUsername.values()]
  return [...used, ...unused, ...(customOpt ? [customOpt] : [])]
})

// 筛选后的作者选项（按昵称/用户名搜索）
const filteredAuthors = computed(() => {
  const kw = authorSearch.value.trim().toLowerCase()
  if (!kw) return sortedAuthorOptions.value
  return sortedAuthorOptions.value.filter((o) => (o.label + ' ' + o.username + ' ' + o.name).toLowerCase().includes(kw))
})

// 加载用户列表，组装为下拉选项
async function loadUserOptions() {
  try {
    const users = await getUsers()
    userOptions.value = [
      { key: '__official', label: '观文阁编辑部（官方蓝V）', username: '', name: '观文阁编辑部' },
      ...users.map((u) => {
        const v = u.verify || {}
        const tag = v.blue ? '（蓝V）' : v.yellow ? '（黄V）' : ''
        return { key: u.username, label: `${u.nickname || u.username}${tag}`, username: u.username, name: u.nickname || u.username }
      }),
      { key: '__custom', label: '✍ 自定义作者（手动输入）', username: '__custom', name: '' },
    ]
  } catch (e) {
    showToast('作者列表加载失败：' + e.message, 'error')
    userOptions.value = [
      { key: '__official', label: '观文阁编辑部（官方蓝V）', username: '', name: '观文阁编辑部' },
      { key: '__custom', label: '✍ 自定义作者（手动输入）', username: '__custom', name: '' },
    ]
  }
}

/** 当前选择对应的署名文本（编辑模式提交用） */
function selectedAuthorName(fallback) {
  if (authorSel.value.username === '__custom') return customAuthor.value.trim() || fallback || '观文阁编辑部'
  return authorSel.value.name || '观文阁编辑部'
}

function pickAuthor(opt) {
  authorSel.value = opt
  authorOpen.value = false
  authorSearch.value = ''
  rememberAuthor(opt.username)
}

function toggleAuthor() {
  authorOpen.value = !authorOpen.value
  if (authorOpen.value) authorSearch.value = ''
}

/* ---------- 分类选择：微信编辑标签风格（搜索 + 标签云 + 新建，记忆排序） ---------- */
const catList = ref([]) // 服务端分类 [{ name, count }]
const catSearch = ref('')
const catOpen = ref(false)

// 记忆排序：localStorage 记录最近用过的分类，最近的排最前（与作者下拉一致）
const CATEGORY_HISTORY_KEY = 'gwg_admin_category_history'
const categoryHistory = ref([])
try { categoryHistory.value = JSON.parse(localStorage.getItem(CATEGORY_HISTORY_KEY)) || [] } catch (e) { categoryHistory.value = [] }

function rememberCategory(name) {
  const n = (name || '').trim()
  if (!n) return
  const list = categoryHistory.value.filter((c) => c !== n)
  list.unshift(n)
  categoryHistory.value = list.slice(0, 10) // 最多记住 10 个
  try { localStorage.setItem(CATEGORY_HISTORY_KEY, JSON.stringify(categoryHistory.value)) } catch (e) { /* 忽略存储失败 */ }
}

// 全量分类：服务端列表 ∪ 记忆里的分类（新建过但尚未保存文章时也能显示），记忆顺序优先
const allCategories = computed(() => {
  const byName = new Map()
  for (const c of catList.value) byName.set(c.name, { name: c.name, count: c.count })
  for (const n of categoryHistory.value) if (!byName.has(n)) byName.set(n, { name: n, count: 0 })
  const used = []
  for (const n of categoryHistory.value) {
    const c = byName.get(n)
    if (c) { used.push(c); byName.delete(n) }
  }
  return [...used, ...byName.values()]
})

// 搜索过滤后的可见分类
const visibleCategories = computed(() => {
  const kw = catSearch.value.trim().toLowerCase()
  if (!kw) return allCategories.value
  return allCategories.value.filter((c) => c.name.toLowerCase().includes(kw))
})

// 搜索词不等于任一现有分类时，提供「新建」入口
const newCategoryTip = computed(() => {
  const kw = catSearch.value.trim()
  return kw && !allCategories.value.some((c) => c.name === kw)
})

async function loadCategories() {
  try {
    const list = await getCategories()
    catList.value = Array.isArray(list) ? list : []
  } catch (e) {
    catList.value = [] // 加载失败时仍可用搜索新建
  }
}

function toggleCat() {
  catOpen.value = !catOpen.value
  if (catOpen.value) {
    catSearch.value = ''
    if (!catList.value.length) loadCategories()
  }
}

function pickCategory(name) {
  form.category = name
  rememberCategory(name)
  catOpen.value = false
  catSearch.value = ''
}

/** 新建分类：取当前搜索词作为新分类名（与已有完全同名时直接选用） */
function createCategory() {
  const kw = catSearch.value.trim()
  if (!kw) return
  const exact = allCategories.value.find((c) => c.name === kw)
  form.category = exact ? exact.name : kw
  rememberCategory(form.category)
  catOpen.value = false
  catSearch.value = ''
}

function clearCategory() {
  form.category = ''
  catOpen.value = false
}

function openCreate() {
  resetForm()
  formModal.mode = 'create'
  // 默认选中：记忆里最近使用过的作者；没有记忆则选官方
  const last = authorHistory.value[0]
  const hit = last !== undefined ? userOptions.value.find((o) => o.username === last && o.username !== '__custom') : null
  authorSel.value = hit || { key: '__official', label: '观文阁编辑部（官方蓝V）', username: '', name: '观文阁编辑部' }
  customAuthor.value = ''
  authorOpen.value = false
  authorSearch.value = ''
  catOpen.value = false
  catSearch.value = ''
  if (!userOptions.value.length) loadUserOptions()
  if (!catList.value.length) loadCategories()
  formModal.visible = true
}

function openEdit(article) {
  resetForm()
  formModal.mode = 'edit'
  form.id = article.id
  form.title = article.title
  form.author = article.author
  form.category = article.category
  form.cover = article.cover || ''
  form.summary = article.summary || ''
  form.content = article.content || ''
  // 按当前文章作者预选中下拉项：先匹配注册用户昵称，再匹配官方，否则走自定义
  if (!userOptions.value.length) loadUserOptions()
  const hit = userOptions.value.find((o) => o.name === article.author && o.username !== '__custom')
    || (article.author === '观文阁编辑部' ? userOptions.value.find((o) => o.username === '') : null)
  if (hit) {
    authorSel.value = hit
    customAuthor.value = ''
  } else {
    authorSel.value = { key: '__custom', label: '✍ 自定义作者（手动输入）', username: '__custom', name: '' }
    customAuthor.value = article.author
  }
  authorOpen.value = false
  authorSearch.value = ''
  catOpen.value = false
  catSearch.value = ''
  if (!catList.value.length) loadCategories()
  formModal.visible = true
}

function closeFormModal() {
  if (formModal.saving) return
  formModal.visible = false
}

/** 简单 Markdown 渲染：先转义 HTML，再处理常用语法 */
function simpleMarkdown(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // 代码块
  const withCode = escaped.replace(/```([\s\S]*?)```/g, '<pre class="md-pre">$1</pre>')
  // 逐行处理标题 / 列表 / 段落
  return withCode
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      if (/^###\s+/.test(t)) return `<h3>${inlineFormat(line.replace(/^###\s+/, ''))}</h3>`
      if (/^##\s+/.test(t)) return `<h2>${inlineFormat(line.replace(/^##\s+/, ''))}</h2>`
      if (/^#\s+/.test(t)) return `<h1>${inlineFormat(line.replace(/^#\s+/, ''))}</h1>`
      if (/^[-*]\s+/.test(t)) return `<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`
      if (/^\d+\.\s+/.test(t)) return `<li>${inlineFormat(line.replace(/^\d+\.\s+/, ''))}</li>`
      return `<p>${inlineFormat(line)}</p>`
    })
    .join('')
}

/** 行内格式：加粗、链接 */
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

const renderedPreview = computed(() => simpleMarkdown(form.content))

async function submitForm() {
  if (!form.title) {
    showToast('标题不能为空', 'error')
    return
  }
  if (!form.content) {
    showToast('正文不能为空', 'error')
    return
  }
  formModal.saving = true
  try {
    if (formModal.mode === 'create') {
      const payload = {
        title: form.title,
        category: form.category,
        cover: form.cover,
        summary: form.summary,
        content: form.content,
      }
      // 作者来自下拉：选中注册用户则传 username（后端取其昵称与V认证）；官方或自定义则传署名文本
      if (authorSel.value.username && authorSel.value.username !== '__custom') {
        payload.username = authorSel.value.username
      } else if (authorSel.value.username === '__custom') {
        payload.author = customAuthor.value.trim() || '观文阁编辑部'
      } else {
        payload.author = '观文阁编辑部'
      }
      await publishArticle(payload)
      showToast('发布成功')
    } else {
      const payload = {
        title: form.title,
        category: form.category,
        cover: form.cover,
        summary: form.summary,
        content: form.content,
      }
      // 与发布一致：选中注册用户则传 username（后端同步昵称与认证V标）；官方/自定义传署名文本
      if (authorSel.value.username && authorSel.value.username !== '__custom') {
        payload.username = authorSel.value.username
      } else {
        payload.author = selectedAuthorName(form.author)
      }
      await updateArticle(form.id, payload)
      showToast('保存成功')
    }
    // 保存成功后记忆本次使用的分类（下次打开时排最前）
    rememberCategory(form.category)
    formModal.visible = false
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    formModal.saving = false
  }
}

/* ---------- 状态变更：上架 / 下架 / 置顶 ---------- */
async function changeStatus(article, status) {
  try {
    await updateArticle(article.id, { status })
    showToast(status === 'published' ? '已上架' : '已下架')
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

async function togglePin(article) {
  try {
    await updateArticle(article.id, { pinned: !article.pinned })
    showToast(article.pinned ? '已取消置顶' : '已置顶')
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

/* ---------- 删除 ---------- */
async function handleDelete(article) {
  if (!window.confirm(`确定删除文章「${article.title}」吗？该操作不可恢复。`)) return
  try {
    await deleteArticle(article.id)
    showToast('删除成功')
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

/* ---------- 审核 ---------- */
const reviewModal = reactive({ visible: false, target: null, saving: false })

function openReview(article) {
  reviewModal.target = article
  reviewModal.visible = true
}

async function doReview(action) {
  reviewModal.saving = true
  try {
    await reviewArticle(reviewModal.target.id, action)
    showToast(action === 'approve' ? '已通过' : '已驳回')
    reviewModal.visible = false
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    reviewModal.saving = false
  }
}

/* ---------- 批量导入 ---------- */
const importModal = reactive({ visible: false, loading: false, importing: false })
const importList = ref([])
const importResult = ref(null)

async function openImport() {
  importModal.visible = true
  importResult.value = null
  importModal.loading = true
  try {
    importList.value = await getImportList()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    importModal.loading = false
  }
}

async function doImport() {
  importModal.importing = true
  try {
    importResult.value = await runImport()
    showToast('导入完成')
    importList.value = await getImportList()
    loadArticles()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    importModal.importing = false
  }
}

onMounted(loadArticles)
</script>

<style scoped>
/* ---------- 作者选择下拉框 ---------- */
.select-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border, #e0dbcf);
  border-radius: var(--radius, 6px);
  background: var(--bg-card, #fffdf8);
  cursor: pointer;
  user-select: none;
}
.select-box.open { border-color: var(--accent, #b03a2e); }
.select-value {
  font-size: 14px;
  color: var(--text, #2b2b28);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-caret { color: var(--text-3, #8c877d); font-size: 12px; flex: none; }

/* 点击外部关闭的透明遮罩（置于弹窗内容之上） */
.select-mask {
  position: fixed;
  inset: 0;
  z-index: 900;
}

/* 下拉面板 */
.select-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 901;
  background: var(--bg-card, #fffdf8);
  border: 1px solid var(--border, #e0dbcf);
  border-radius: var(--radius, 6px);
  box-shadow: 0 6px 20px rgba(35, 32, 27, 0.18);
  overflow: hidden;
}
.select-search {
  border: none !important;
  border-bottom: 1px solid var(--border, #e0dbcf) !important;
  border-radius: 0 !important;
  height: 38px;
}
.select-list {
  max-height: 220px;
  overflow-y: auto;
}
.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--text, #2b2b28);
  cursor: pointer;
  transition: background .15s ease;
}
.select-option:hover { background: var(--bg-muted, #f3f0e8); }
.select-option.active { color: var(--accent, #b03a2e); font-weight: 600; }
.select-sub { font-style: normal; font-size: 12px; color: var(--text-3, #8c877d); }
.select-empty { padding: 12px; text-align: center; font-size: 13px; color: var(--text-3, #8c877d); }

/* ---------- 分类选择：微信编辑标签风格 ---------- */
.tag-box {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 4px 12px;
  border: 1px solid var(--border, #e0dbcf);
  border-radius: var(--radius, 6px);
  background: var(--bg-card, #fffdf8);
  cursor: pointer;
  user-select: none;
  flex-wrap: wrap;
}
.tag-box.open { border-color: var(--accent, #b03a2e); }
.tag-placeholder { font-size: 14px; color: var(--text-3, #8c877d); }
.tag-box .select-caret { margin-left: auto; }

/* 标签本体（圆角药丸） */
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 20px;
  border: 1px solid var(--border, #e0dbcf);
  background: var(--bg-muted, #f3f0e8);
  color: var(--text, #2b2b28);
  transition: all .15s ease;
  white-space: nowrap;
}
/* 关闭态：已选中的分类标签 */
.tag-chip.active {
  background: var(--accent, #b03a2e);
  border-color: var(--accent, #b03a2e);
  color: #fff;
}
/* 标签右上角的 × */
.tag-x {
  font-style: normal;
  font-size: 14px;
  line-height: 1;
  margin-left: 2px;
  opacity: .7;
  cursor: pointer;
}
.tag-x:hover { opacity: 1; }

/* 展开态面板内的标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  max-height: 220px;
  overflow-y: auto;
}
.tag-chip.pick { cursor: pointer; }
.tag-chip.pick:hover {
  border-color: var(--accent, #b03a2e);
  color: var(--accent, #b03a2e);
}
.tag-chip.pick.active {
  background: var(--accent, #b03a2e);
  border-color: var(--accent, #b03a2e);
  color: #fff;
}
.tag-count {
  font-style: normal;
  font-size: 11px;
  opacity: .65;
}
/* 「新建」标签（虚线边框，微信风格） */
.tag-chip.create {
  border-style: dashed;
  border-color: var(--accent, #b03a2e);
  color: var(--accent, #b03a2e);
  cursor: pointer;
  background: transparent;
}
.tag-chip.create:hover { background: rgba(176, 58, 46, 0.08); }
</style>
