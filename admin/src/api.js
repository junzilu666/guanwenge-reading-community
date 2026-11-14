/**
 * api.js —— 后台接口统一封装
 * 基于 fetch 封装：BASE 前缀 '/api'，自动携带管理员 token（localStorage key 'gw_admin_token'），
 * 解析后端统一返回结构 {code,msg,data}，code !== 0 时抛出 Error。
 * 同时提供全局轻量 toast 提示（每个页面复用，避免额外文件）。
 */

// 后端地址：默认相对路径 /api（开发走 Vite 代理）；也可通过 admin/.env 中 VITE_API_BASE 指定直连地址
export const BASE = import.meta.env.VITE_API_BASE || '/api'
export const TOKEN_KEY = 'gw_admin_token'

/** 读取本地保存的管理员 token */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/** 保存管理员 token */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除管理员 token */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 通用请求封装
 * @param {string} method HTTP 方法（GET/POST/PUT/DELETE）
 * @param {string} url 相对路径（不含 /api 前缀）
 * @param {object} [body] 请求体（对象）
 * @returns {Promise<any>} 后端返回的 data 字段
 */
async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(BASE + url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('网络请求失败，请确认后端服务已启动')
  }

  let json
  try {
    json = await res.json()
  } catch (e) {
    throw new Error(`请求失败（HTTP ${res.status}）`)
  }

  // 统一返回结构校验：code 0 成功，其余失败
  if (!json || json.code !== 0) {
    // token 失效（401）时清理本地 token
    if (res.status === 401) clearToken()
    throw new Error((json && json.msg) || '请求失败')
  }
  return json.data
}

/** GET 请求（支持 query 参数，自动过滤空值） */
function get(url, params) {
  if (params) {
    const qs = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&')
    if (qs) url += `?${qs}`
  }
  return request('GET', url)
}

/** POST 请求 */
function post(url, body) {
  return request('POST', url, body)
}

/** PUT 请求 */
function put(url, body) {
  return request('PUT', url, body)
}

/** DELETE 请求 */
function del(url) {
  return request('DELETE', url)
}

/* ================= 认证 ================= */

/** 管理员登录（固定账号 admin / admin） */
export const adminLogin = (username, password) => post('/admin/login', { username, password })

/* ================= 数据监测 ================= */

/** 获取统计数据（总量 / 近7天活跃 / 分类分布 / 热门 TOP10） */
export const getStats = () => get('/admin/stats')

/* ================= 用户管理 ================= */

/** 用户列表 */
export const getUsers = () => get('/admin/users')

/** 管理员后台创建用户（自动生成用户文件夹） */
export const createUser = (data) => post('/admin/users', data)

/** 删除用户（账号+文件夹+点赞/评论/投稿文章/黄V申请 一并清除） */
export const deleteUser = (username) => del(`/admin/users/${encodeURIComponent(username)}`)

/** 用户文件夹详情 */
export const getUserDetail = (username) => get(`/admin/users/${encodeURIComponent(username)}`)

/** 封禁用户 */
export const banUser = (username) => post(`/admin/users/${encodeURIComponent(username)}/ban`)

/** 解封用户 */
export const unbanUser = (username) => post(`/admin/users/${encodeURIComponent(username)}/unban`)

/** 授予 / 撤销蓝V黄V认证（type: 'blue'|'yellow'，action: 'grant'|'revoke'） */
export const verifyUser = (username, type, action) =>
  post(`/admin/users/${encodeURIComponent(username)}/verify`, { type, action })

/** 调整用户金币（amount 为正负整数） */
export const adjustCoins = (username, amount) =>
  post(`/admin/users/${encodeURIComponent(username)}/coins`, { amount })

/* ================= 内容管理 ================= */

/** 文章列表（支持 keyword 搜索，含正文前 200 字预览） */
export const getArticles = (keyword) => get('/admin/articles', { keyword })

/** 发布新文章 */
export const publishArticle = (data) => post('/admin/articles', data)

/** 编辑文章 */
export const updateArticle = (id, data) => put(`/admin/articles/${id}`, data)

/** 删除文章 */
export const deleteArticle = (id) => del(`/admin/articles/${id}`)

/** 获取文章分类列表（含各分类文章数，来自公共接口） */
export const getCategories = () => get('/articles/categories')

/** 审核投稿文章（action: 'approve'|'reject'） */
export const reviewArticle = (id, action) => post(`/admin/articles/${id}/review`, { action })

/** 获取待导入文件清单 */
export const getImportList = () => get('/admin/import')

/** 执行批量导入 */
export const runImport = () => post('/admin/import')

/* ================= 评论审核 ================= */

/** 全部评论（含文章标题） */
export const getComments = () => get('/admin/comments')

/** 删除违规评论 */
export const deleteComment = (id) => del(`/admin/comments/${id}`)

/* ================= 黄V申请 ================= */

/** 黄V认证申请列表 */
export const getApplications = () => get('/admin/applications')

/** 审核黄V申请（action: 'approve'|'reject'） */
export const reviewApplication = (username, action) =>
  post(`/admin/applications/${encodeURIComponent(username)}`, { action })

/* ================= 打赏统计 ================= */

/** 打赏记录列表 + 汇总（count / totalAmount） */
export const getRewards = () => get('/admin/rewards')

/** 手动录入打赏记录（amount 必填 > 0，name/note 可选） */
export const addReward = (data) => post('/admin/rewards', data)

/** 删除打赏记录 */
export const deleteReward = (id) => del(`/admin/rewards/${id}`)

/* ================= 系统配置 / 日志 ================= */

/** 获取系统配置 */
export const getConfig = () => get('/admin/config')

/** 保存系统配置（growth / recommend 分部提交） */
export const saveConfig = (data) => put('/admin/config', data)

/** 获取系统日志（后端已倒序返回） */
export const getLogs = () => get('/admin/logs')

/* ================= 全局 toast 提示 ================= */

let toastContainer = null

/**
 * 轻量 toast 提示（自动挂载容器到 body）
 * @param {string} msg 提示文案
 * @param {'success'|'error'|'info'} [type='success'] 提示类型
 */
export function showToast(msg, type = 'success') {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  toastContainer.appendChild(el)
  // 下一帧加显示类，触发过渡动画
  requestAnimationFrame(() => el.classList.add('toast-show'))
  setTimeout(() => {
    el.classList.remove('toast-show')
    setTimeout(() => el.remove(), 300)
  }, 2600)
}
