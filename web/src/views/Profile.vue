<template>
  <div class="profile">
    <!-- 未登录：居中登录引导 -->
    <div v-if="!store.isLoggedIn" class="login-guide">
      <div class="guide-seal">阁</div>
      <h2 class="guide-title">欢迎来到观文阁</h2>
      <p class="guide-desc">登录后开启你的阅读之旅，收藏好文、参与评论、记录成长</p>
      <button class="btn primary block" @click="goLogin">立即登录 / 注册</button>
    </div>

    <!-- 已登录：个人主页 -->
    <template v-else-if="me">
      <!-- 头部：头像 / 昵称 / 认证 / 等级 / 经验 / 金币 / 打卡 -->
      <div class="profile-head card">
        <div class="head-row">
          <!-- 头像：加载失败时回退为首字圆形 -->
          <img v-if="me.avatar && !avatarFailed" :src="me.avatar" class="avatar" alt="头像" @error="onAvatarError" />
          <div v-else class="avatar avatar-letter">{{ (me.nickname || '阁')[0] }}</div>
          <div class="head-info">
            <div class="nick-row">
              <span class="nickname">{{ me.nickname }}</span>
              <i v-if="me.verify && me.verify.blue" class="v-badge blue" title="官方认证">V</i>
              <i v-else-if="me.verify && me.verify.yellow" class="v-badge yellow" title="认证创作者">V</i>
            </div>
            <div class="level-row">
              <span class="level-seal">Lv.{{ me.growth.level }}</span>
              <span class="exp-text">{{ me.growth.expInLevel }}/{{ me.growth.expToNext }} 经验</span>
            </div>
          </div>
          <div class="coins">
            <span class="coin-icon">¥</span>
            <span class="coin-num">{{ me.growth.coins }}</span>
            <span class="coin-label">金币</span>
          </div>
        </div>

        <!-- 经验进度条 -->
        <div class="exp-area">
          <div class="progress">
            <div class="progress-bar" :style="{ width: expPercent + '%' }"></div>
          </div>
          <div class="exp-meta">
            <span>总经验 {{ me.growth.totalExp }}</span>
            <span>已读 {{ me.growth.readCount }} · 评论 {{ me.growth.commentCount }} · 发布 {{ me.growth.publishCount }}</span>
          </div>
        </div>

        <!-- 今日打卡 -->
        <button
          class="checkin-btn"
          :class="{ done: me.growth.checkedInToday }"
          :disabled="me.growth.checkedInToday || checking"
          @click="checkin"
        >
          {{ me.growth.checkedInToday ? '今日已打卡' : (checking ? '打卡中…' : '今日打卡领金币') }}
        </button>
      </div>

      <!-- 认证状态 -->
      <div class="verify-card card">
        <div class="verify-row">
          <span class="verify-label">认证状态</span>
          <template v-if="me.verify && me.verify.blue">
            <i class="v-badge blue">V</i>
            <span class="verify-text blue-text">蓝V官方认证</span>
          </template>
          <template v-else-if="me.verify && me.verify.yellow">
            <i class="v-badge yellow">V</i>
            <span class="verify-text yellow-text">黄V认证创作者</span>
          </template>
          <template v-else-if="me.verify && me.verify.pending">
            <span class="verify-text pending-text">黄V申请审核中</span>
          </template>
          <template v-else>
            <span class="verify-text">未认证</span>
            <button class="btn sm" @click="applyVerify">申请黄V认证</button>
          </template>
        </div>
      </div>

      <!-- 打赏卡片：请作者喝咖啡（仅静态微信收款二维码展示） -->
      <div class="coffee-card card">
        <p class="coffee-title">觉得观文阁实用舒心，欢迎扫码请作者喝一杯咖啡~</p>
        <div class="coffee-qr">
          <img
            v-if="!qrMissing"
            :src="rewardQrUrl"
            alt="微信收款二维码"
            class="coffee-img"
            @error="qrMissing = true"
          />
          <div v-else class="coffee-img coffee-placeholder">二维码占位（请将图片放入 web/public/wechat_reward.png）</div>
        </div>
        <p class="coffee-tip">自愿打赏，资金用于项目日常维护</p>
      </div>

      <!-- 功能入口 -->
      <div class="menu card">
        <button class="list-entry" @click="go('/my-articles')">
          <span class="entry-icon">文</span>我的文章<span class="entry-arrow">›</span>
        </button>
        <button class="list-entry" @click="go('/favorites')">
          <span class="entry-icon">藏</span>我的收藏<span class="entry-arrow">›</span>
        </button>
        <button class="list-entry" @click="go('/history')">
          <span class="entry-icon">史</span>阅读历史<span class="entry-arrow">›</span>
        </button>
        <button class="list-entry" @click="go('/publish')">
          <span class="entry-icon">笔</span>发布文章<span class="entry-arrow">›</span>
        </button>
        <button class="list-entry" @click="go('/settings')">
          <span class="entry-icon">设</span>个人设置<span class="entry-arrow">›</span>
        </button>
        <button class="list-entry logout" @click="logout">
          <span class="entry-icon">退</span>退出登录<span class="entry-arrow">›</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, createToast } from '../api.js'
import { store } from '../store.js'

export default {
  name: 'Profile',
  setup() {
    const router = useRouter()

    const user = ref(null)   // 最新拉取的用户资料
    const checking = ref(false)
    const avatarFailed = ref(false) // 头像加载失败标记
    const qrMissing = ref(false)    // 打赏二维码图片缺失标记（占位兜底）
    // 打赏二维码地址：文件位于 web/public/wechat_reward.png（Vite 静态资源目录，根路径访问）
    // 使用动态绑定避免编译期资源解析报错；图片未放置时返回404，由 @error 显示占位
    const rewardQrUrl = '/wechat_reward.png'

    // 展示数据：优先用最新拉取，未拉到前用 store 缓存
    const me = computed(() => user.value || store.state.user)

    // 当前级内经验百分比
    const expPercent = computed(() => {
      const g = me.value && me.value.growth
      if (!g || !g.expToNext) return 0
      return Math.min(100, Math.round((g.expInLevel / g.expToNext) * 100))
    })

    // 拉取最新资料（成长数据）
    async function refresh() {
      if (!store.isLoggedIn) return
      try {
        const u = await api.stats()
        user.value = u
        store.setUser(u)
      } catch (e) {
        createToast(e.message || '加载失败')
      }
    }

    // 今日打卡
    async function checkin() {
      checking.value = true
      try {
        const data = await api.checkin()
        createToast(`打卡成功，获得 ${data.coins} 金币`)
        if (me.value) {
          const updated = { ...me.value, growth: data.growth }
          user.value = updated
          store.setUser(updated)
        }
      } catch (e) {
        createToast(e.message || '打卡失败')
      } finally {
        checking.value = false
      }
    }

    // 黄V申请
    async function applyVerify() {
      try {
        await api.verifyApply()
        createToast('黄V申请已提交，等待管理员审核')
        refresh()
      } catch (e) {
        createToast(e.message || '申请失败')
      }
    }

    // 退出登录
    function logout() {
      api.logout().catch(() => { /* 忽略退出接口异常，本地照常清理 */ })
      store.logout()
      user.value = null
      createToast('已退出登录')
      router.push('/')
    }

    function goLogin() {
      router.push('/login')
    }

    function go(path) {
      router.push(path)
    }

    // 头像加载失败时回退为首字圆形
    function onAvatarError() {
      avatarFailed.value = true
    }

    onMounted(refresh)

    return { store, me, expPercent, checking, avatarFailed, qrMissing, rewardQrUrl, checkin, applyVerify, logout, goLogin, go, onAvatarError }
  }
}
</script>

<style scoped>
.profile { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }

/* ---------- 未登录引导 ---------- */
.login-guide {
  margin-top: 40px;
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.guide-seal {
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-title);
  font-size: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(176, 58, 46, 0.35);
}
.guide-title { font-family: var(--font-title); font-size: 22px; margin-bottom: 8px; }
.guide-desc { font-size: 14px; color: var(--text-2); margin-bottom: 28px; }

/* ---------- 个人头部 ---------- */
.profile-head { padding: 20px 18px; margin-bottom: 12px; }
.head-row { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--border);
  object-fit: cover;
  flex: none;
}
.avatar-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  color: #fff;
  font-family: var(--font-title);
  font-size: 26px;
}
.head-info { flex: 1; min-width: 0; }
.nick-row { display: flex; align-items: center; margin-bottom: 6px; }
.nickname {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.level-row { display: flex; align-items: center; gap: 8px; }
.level-seal {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--accent-soft);
}
.exp-text { font-size: 12px; color: var(--text-3); }

/* 金币 */
.coins {
  text-align: center;
  flex: none;
  padding: 6px 10px;
  background: var(--bg-muted);
  border-radius: 8px;
}
.coin-icon {
  display: block;
  font-style: normal;
  color: var(--yellow-v);
  font-size: 14px;
  font-weight: 700;
}
.coin-num { display: block; font-size: 18px; font-weight: 700; color: var(--text); }
.coin-label { display: block; font-size: 11px; color: var(--text-3); }

/* 经验区 */
.exp-area { margin-top: 16px; }
.exp-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-3);
  margin-top: 6px;
}

/* 打卡按钮 */
.checkin-btn {
  margin-top: 14px;
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  transition: all .2s ease;
}
.checkin-btn:hover { background: var(--accent-2); }
.checkin-btn.done {
  background: var(--bg-muted);
  color: var(--text-3);
  cursor: not-allowed;
}

/* ---------- 认证卡片 ---------- */
.verify-card { padding: 14px 18px; margin-bottom: 12px; }
.verify-row { display: flex; align-items: center; gap: 8px; }
.verify-label { font-size: 14px; color: var(--text-2); margin-right: auto; }
.verify-text { font-size: 13px; color: var(--text-2); }
.blue-text { color: var(--blue-v); font-weight: 600; }
.yellow-text { color: var(--yellow-v); font-weight: 600; }
.pending-text { color: var(--warn); }

/* ---------- 打赏卡片：请作者喝咖啡 ---------- */
.coffee-card {
  padding: 18px;
  margin-bottom: 12px;
  text-align: center;
  border-radius: 8px;
}
.coffee-title {
  font-family: var(--font-title);
  font-size: 15px;
  color: var(--text);
  margin-bottom: 14px;
  line-height: 1.6;
}
.coffee-qr {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.coffee-img {
  width: 168px;
  height: 168px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  object-fit: contain;
}
.coffee-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
  background: var(--bg-muted);
}
.coffee-tip {
  font-size: 12px;
  color: var(--text-3);
}

/* ---------- 功能入口 ---------- */
.menu { overflow: hidden; }
.logout .entry-icon { background: rgba(197, 48, 48, 0.08); color: var(--danger); }
.logout { color: var(--danger); }
</style>
