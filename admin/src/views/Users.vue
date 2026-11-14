<template>
  <div class="page">
    <!-- 工具行：搜索 + 刷新 -->
    <div class="toolbar">
      <input
        v-model.trim="search"
        class="input"
        type="text"
        placeholder="按用户名 / 昵称搜索"
      />
      <div class="spacer"></div>
      <button class="btn btn-primary" @click="goAdd">＋ 添加用户</button>
      <button class="btn btn-ghost" :disabled="loading" @click="loadUsers">刷新</button>
    </div>

    <!-- 用户表格 -->
    <div class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>昵称</th>
              <th>等级</th>
              <th>经验</th>
              <th>金币</th>
              <th>认证</th>
              <th>状态</th>
              <th>注册时间</th>
              <th style="min-width: 260px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="loading-tip">加载中…</td>
            </tr>
            <tr v-else-if="!filteredUsers.length">
              <td colspan="9" class="empty">
                {{ users.length ? '没有匹配的用户' : '暂无用户数据' }}
              </td>
            </tr>
            <tr v-for="user in filteredUsers" :key="user.username">
              <td><strong>{{ user.username }}</strong></td>
              <td class="td-ellipsis" :title="user.nickname">{{ user.nickname }}</td>
              <td>Lv.{{ user.level }}</td>
              <td>{{ user.exp }}</td>
              <td>{{ user.coins }}</td>
              <td>
                <span v-if="user.verify && user.verify.blue" class="badge badge-v-blue">蓝V</span>
                <span v-if="user.verify && user.verify.yellow" class="badge badge-v-yellow">黄V</span>
                <span v-if="!user.verify || (!user.verify.blue && !user.verify.yellow)" class="badge badge-gray">无</span>
              </td>
              <td>
                <span v-if="user.status === 'banned'" class="badge badge-danger">封禁</span>
                <span v-else class="badge badge-success">正常</span>
              </td>
              <td>{{ user.createdAt }}</td>
              <td>
                <div class="ops">
                  <button class="btn btn-ghost btn-sm" @click="goDetail(user)">查看文件夹</button>
                  <button
                    v-if="user.status === 'banned'"
                    class="btn btn-success btn-sm"
                    @click="toggleBan(user)"
                  >解封</button>
                  <button
                    v-else
                    class="btn btn-ghost-danger btn-sm"
                    @click="toggleBan(user)"
                  >封禁</button>
                  <button
                    v-if="user.verify && user.verify.blue"
                    class="btn btn-ghost btn-sm"
                    @click="doVerify(user, 'blue', 'revoke')"
                  >撤销蓝V</button>
                  <button
                    v-else
                    class="btn btn-ghost btn-sm"
                    @click="doVerify(user, 'blue', 'grant')"
                  >授予蓝V</button>
                  <button
                    v-if="user.verify && user.verify.yellow"
                    class="btn btn-ghost btn-sm"
                    @click="doVerify(user, 'yellow', 'revoke')"
                  >撤销黄V</button>
                  <button
                    v-else
                    class="btn btn-ghost btn-sm"
                    @click="doVerify(user, 'yellow', 'grant')"
                  >授予黄V</button>
                  <button class="btn btn-info btn-sm" @click="adjustCoins(user)">调整金币</button>
                  <button class="btn btn-danger btn-sm" @click="handleDelete(user)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Users.vue —— 用户管理
 * 用户列表 + 本地搜索过滤；封禁/解封、蓝V黄V授予撤销、调整金币。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, banUser, unbanUser, verifyUser, adjustCoins as apiAdjustCoins, deleteUser, showToast } from '../api'

const router = useRouter()

const users = ref([])
const search = ref('')
const loading = ref(false)

// 本地按用户名 / 昵称过滤
const filteredUsers = computed(() => {
  const kw = search.value.toLowerCase()
  if (!kw) return users.value
  return users.value.filter(
    (u) =>
      (u.username || '').toLowerCase().includes(kw) || (u.nickname || '').toLowerCase().includes(kw)
  )
})

async function loadUsers() {
  loading.value = true
  try {
    users.value = await getUsers()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

// 查看用户文件夹
function goDetail(user) {
  router.push(`/users/${encodeURIComponent(user.username)}`)
}

// 跳转添加用户页面
function goAdd() {
  router.push('/users/add')
}

// 封禁 / 解封（危险操作需确认）
async function toggleBan(user) {
  const banned = user.status === 'banned'
  if (!window.confirm(banned ? `确定解封用户「${user.username}」吗？` : `确定封禁用户「${user.username}」吗？封禁后无法登录。`)) return
  try {
    if (banned) await unbanUser(user.username)
    else await banUser(user.username)
    showToast(banned ? '已解封' : '已封禁')
    loadUsers()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

// 授予 / 撤销蓝V黄V（二次确认）
async function doVerify(user, type, action) {
  const typeText = type === 'blue' ? '蓝V' : '黄V'
  const actionText = action === 'grant' ? '授予' : '撤销'
  if (!window.confirm(`确定${actionText}「${user.username}」的${typeText}认证吗？`)) return
  try {
    await verifyUser(user.username, type, action)
    showToast(`${typeText}${actionText}成功`)
    loadUsers()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

// 调整金币：prompt 输入正负整数
async function adjustCoins(user) {
  const input = window.prompt(
    `调整「${user.username}」的金币（正数增加、负数扣减，0 取消）：`,
    '0'
  )
  if (input === null) return
  const amount = parseInt(input, 10)
  if (isNaN(amount) || amount === 0) {
    showToast('请输入非零整数', 'error')
    return
  }
  try {
    const data = await apiAdjustCoins(user.username, amount)
    showToast(`调整成功，当前金币 ${data.coins}`)
    loadUsers()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

// 删除用户（危险操作，需输入用户名二次确认）
async function handleDelete(user) {
  const tip = `确定删除用户「${user.username}」吗？\n\n删除后将同时清除：\n· 用户独立文件夹（资料/成长/收藏/历史/评论）\n· 该用户的点赞、评论记录\n· 该用户发布的文章（含正文）\n· 黄V申请记录\n\n该操作不可恢复！`
  const input = window.prompt(tip + '\n\n如需继续，请输入该用户名以确认：', '')
  if (input === null) return
  if (input.trim() !== user.username) {
    showToast('输入的用户名不一致，已取消删除', 'error')
    return
  }
  try {
    await deleteUser(user.username)
    showToast(`用户「${user.username}」已删除`)
    loadUsers()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

onMounted(loadUsers)
</script>
