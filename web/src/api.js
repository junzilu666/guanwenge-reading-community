// 全局接口封装：统一附带 token、解析 {code,msg,data} 响应；并提供轻量 toast 与格式化工具
// 后端地址：默认相对路径 /api（开发走 Vite 代理）；也可通过 web/.env 中 VITE_API_BASE 指定直连地址
const BASE = import.meta.env.VITE_API_BASE || '/api'

// ---------- token 读写（localStorage key: gw_token） ----------
export function getToken() {
  return localStorage.getItem('gw_token') || ''
}

export function setToken(token) {
  localStorage.setItem('gw_token', token)
}

// ---------- 统一请求 ----------
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(BASE + path, { ...options, headers, body })
  } catch (e) {
    throw new Error('网络异常，请检查网络后重试')
  }

  let json = null
  try {
    json = await res.json()
  } catch (e) {
    /* 忽略非 JSON 响应 */
  }
  if (!json || typeof json.code === 'undefined') throw new Error('服务响应异常，请稍后重试')
  if (json.code !== 0) throw new Error(json.msg || '请求失败')
  return json.data
}

// ---------- 轻量 toast 提示：动态创建 DOM，1.8s 后消失 ----------
export function createToast(msg) {
  let wrap = document.querySelector('.gw-toast-wrap')
  if (!wrap) {
    wrap = document.createElement('div')
    wrap.className = 'gw-toast-wrap'
    document.body.appendChild(wrap)
  }
  const el = document.createElement('div')
  el.className = 'gw-toast'
  el.textContent = msg
  wrap.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, 1800)
}

// ---------- 格式化工具 ----------
// 数字缩写：12000 -> 1.2万
export function fmtCount(n) {
  const num = Number(n) || 0
  if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(num)
}

// 时间格式化：'YYYY-MM-DD HH:mm:ss' -> 'MM-DD HH:mm'（跨年显示完整日期）
export function fmtTime(t) {
  if (!t) return ''
  const s = String(t).replace('T', ' ').slice(0, 16)
  return s
}

// ---------- 接口函数（按后端契约调用） ----------
export const api = {
  // 认证
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // 文章浏览
  // 首页信息流：已按置顶 + 认证 + 热度加权排序，登录时传 user 以获得 liked 状态
  feed: (page = 1, size = 5, user = '') =>
    request(`/articles/feed?page=${page}&size=${size}${user ? '&user=' + encodeURIComponent(user) : ''}`),
  articles: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    const str = qs.toString()
    return request(`/articles${str ? '?' + str : ''}`)
  },
  categories: () => request('/articles/categories'),
  articleDetail: (id, user = '') =>
    request(`/articles/${id}${user ? '?user=' + encodeURIComponent(user) : ''}`),
  like: (id) => request(`/articles/${id}/like`, { method: 'POST' }),

  // 评论
  comments: (id, page = 1, size = 10) =>
    request(`/articles/${id}/comments?page=${page}&size=${size}`),
  addComment: (id, content) =>
    request(`/articles/${id}/comments`, { method: 'POST', body: { content } }),

  // 用户中心
  profile: () => request('/user/profile'),
  updateProfile: (data) => request('/user/profile', { method: 'PUT', body: data }),
  favorites: () => request('/user/favorites'),
  toggleFavorite: (articleId) => request('/user/favorites', { method: 'POST', body: { articleId } }),
  history: () => request('/user/history'),
  clearHistory: () => request('/user/history', { method: 'DELETE' }),
  checkin: () => request('/user/checkin', { method: 'POST' }),
  stats: () => request('/user/stats'),
  myArticles: () => request('/user/articles'),
  publish: (data) => request('/user/articles', { method: 'POST', body: data }),
  verifyApply: () => request('/user/verify-apply', { method: 'POST' })
}
