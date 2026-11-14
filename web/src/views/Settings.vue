<template>
  <div class="settings">
    <h2 class="page-title">个人设置</h2>

    <!-- 资料修改 -->
    <div class="section card">
      <h3 class="section-title">基本资料</h3>
      <div class="field">
        <label>昵称</label>
        <input v-model.trim="form.nickname" class="input" maxlength="20" placeholder="请输入昵称" />
      </div>
      <div class="field">
        <label>头像 URL（可选）</label>
        <input v-model.trim="form.avatar" class="input" placeholder="https://… 图片地址" />
      </div>
      <div class="field">
        <label>个人简介（可选）</label>
        <textarea v-model.trim="form.bio" class="textarea" rows="3" maxlength="100" placeholder="一句话介绍自己"></textarea>
      </div>
      <button class="btn primary block" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存资料' }}
      </button>
    </div>

    <!-- 主题切换 -->
    <div class="section card">
      <h3 class="section-title">外观</h3>
      <div class="setting-row">
        <div>
          <div class="setting-name">深色模式</div>
          <div class="setting-desc">切换阅读界面深浅色主题</div>
        </div>
        <button class="switch" :class="{ on: isDark }" role="switch" :aria-checked="isDark" @click="toggleTheme">
          <span class="switch-dot"></span>
        </button>
      </div>
    </div>

    <!-- 关于 -->
    <div class="section card">
      <h3 class="section-title">关于观文阁</h3>
      <p class="about-text">
        观文阁是一个简约国风文章阅读社区，汇聚来自四面八方的创作者与读者。
        在这里，你可以滑动浏览好文、参与评论互动、收藏心仪内容，也可以通过投稿分享你的文字。
        愿你在观文阁，与好文相遇，与知音同行。
      </p>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { api, createToast } from '../api.js'
import { store } from '../store.js'

export default {
  name: 'Settings',
  setup() {
    const form = reactive({ nickname: '', avatar: '', bio: '' })
    const saving = ref(false)
    const isDark = ref(document.documentElement.classList.contains('dark'))

    // 回填当前用户资料
    onMounted(() => {
      const u = store.state.user
      if (u) {
        form.nickname = u.nickname || ''
        form.avatar = u.avatar || ''
        form.bio = u.bio || ''
      }
    })

    // 主题切换（与 App 顶栏切换保持一致的持久化方式）
    function toggleTheme() {
      isDark.value = !isDark.value
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('gw_theme', isDark.value ? 'dark' : 'light')
    }

    // 保存资料
    async function save() {
      if (!form.nickname.trim()) return createToast('昵称不能为空')
      saving.value = true
      try {
        const user = await api.updateProfile({
          nickname: form.nickname.trim(),
          avatar: form.avatar.trim(),
          bio: form.bio.trim()
        })
        store.setUser(user)
        createToast('资料已保存')
      } catch (e) {
        createToast(e.message || '保存失败')
      } finally {
        saving.value = false
      }
    }

    return { form, saving, isDark, toggleTheme, save }
  }
}
</script>

<style scoped>
.settings { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }
.page-title { font-family: var(--font-title); font-size: 20px; margin-bottom: 14px; }

.section { padding: 18px; margin-bottom: 14px; }
.section-title {
  font-family: var(--font-title);
  font-size: 16px;
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

/* 主题开关行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.setting-name { font-size: 14px; margin-bottom: 2px; }
.setting-desc { font-size: 12px; color: var(--text-3); }

/* 开关 */
.switch {
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  position: relative;
  transition: background .25s ease;
}
.switch .switch-dot {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: transform .25s ease;
}
.switch.on { background: var(--accent); border-color: var(--accent); }
.switch.on .switch-dot { transform: translateX(20px); }

.about-text { font-size: 14px; color: var(--text-2); line-height: 1.9; }
</style>
