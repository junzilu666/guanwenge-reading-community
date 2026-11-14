// 全局用户状态：token / user（基于 Vue reactive，localStorage 持久化）
import { reactive } from 'vue'
import { api, getToken, setToken } from './api.js'

// 从 localStorage 恢复已保存的用户信息
function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('gw_user') || 'null')
  } catch (e) {
    return null
  }
}

const state = reactive({
  token: getToken(),
  user: readSavedUser()
})

export const store = {
  state,

  // 是否已登录（读取 reactive 的 token，天然具备响应式）
  get isLoggedIn() {
    return !!state.token
  },

  // 当前用户名（用于文章详情 liked 状态等查询参数）
  get username() {
    return state.user ? state.user.username : ''
  },

  // 登录成功：写入内存 + localStorage
  login(token, user) {
    state.token = token
    state.user = user
    setToken(token)
    localStorage.setItem('gw_user', JSON.stringify(user))
  },

  // 更新用户资料（如打卡、修改资料后）
  setUser(user) {
    state.user = user
    localStorage.setItem('gw_user', JSON.stringify(user))
  },

  // 退出登录：清空内存 + localStorage
  logout() {
    state.token = ''
    state.user = null
    localStorage.removeItem('gw_token')
    localStorage.removeItem('gw_user')
  },

  // 拉取最新用户信息（token 失效时自动退出并抛错）
  async fetchMe() {
    if (!state.token) return null
    try {
      const user = await api.me()
      this.setUser(user)
      return user
    } catch (e) {
      this.logout()
      throw e
    }
  }
}
