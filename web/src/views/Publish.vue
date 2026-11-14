<template>
  <div class="publish">
    <h2 class="page-title">发布文章</h2>

    <!-- 编辑 / 预览 切换 -->
    <div class="edit-tabs">
      <button class="edit-tab" :class="{ active: mode === 'edit' }" @click="mode = 'edit'">编辑</button>
      <button class="edit-tab" :class="{ active: mode === 'preview' }" @click="mode = 'preview'">预览</button>
    </div>

    <!-- 编辑模式 -->
    <form v-if="mode === 'edit'" class="publish-form card" @submit.prevent="submit">
      <div class="field">
        <label>标题</label>
        <input v-model.trim="form.title" class="input" placeholder="给你的文章起个标题" maxlength="50" />
      </div>
      <div class="field">
        <label>分类</label>
        <select v-model="form.category" class="select">
          <option value="" disabled>请选择分类</option>
          <option v-for="c in cats" :key="c.name" :value="c.name">{{ c.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>摘要（可选，留空自动截取正文前100字）</label>
        <input v-model.trim="form.summary" class="input" placeholder="一句话概括文章内容" maxlength="120" />
      </div>
      <div class="field">
        <label>正文（支持 Markdown 语法）</label>
        <textarea v-model="form.content" class="textarea md-editor" placeholder="在这里书写你的文章…&#10;支持 # 标题、**加粗**、> 引用、``` 代码块、列表等" rows="14"></textarea>
      </div>
      <button class="btn primary block" type="submit" :disabled="submitting">
        {{ submitting ? '提交中…' : '投稿' }}
      </button>
      <p class="publish-tip">投稿成功后进入审核队列，审核通过后将公开展示</p>
    </form>

    <!-- 预览模式 -->
    <div v-else class="preview-area card">
      <template v-if="form.title || form.content">
        <h3 class="preview-title">{{ form.title || '（未填写标题）' }}</h3>
        <div class="article-body" v-html="previewHtml"></div>
      </template>
      <div v-else class="empty"><div class="empty-mark">空</div><p>还没有内容，去「编辑」页写点什么吧</p></div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { api, createToast } from '../api.js'

export default {
  name: 'Publish',
  setup() {
    const router = useRouter()

    const mode = ref('edit') // edit | preview
    const submitting = ref(false)
    const cats = ref([])
    const form = reactive({ title: '', category: '', content: '', summary: '' })

    // 预览渲染：marked 解析 + DOMPurify 消毒
    const previewHtml = computed(() => {
      if (!form.content) return ''
      return DOMPurify.sanitize(marked.parse(form.content))
    })

    // 拉取分类供下拉选择
    async function fetchCats() {
      try {
        cats.value = await api.categories()
        if (cats.value.length && !form.category) form.category = cats.value[0].name
      } catch (e) {
        createToast(e.message || '分类加载失败')
      }
    }

    // 提交投稿（进入待审核）
    async function submit() {
      if (!form.title) return createToast('请填写标题')
      if (!form.category) return createToast('请选择分类')
      if (!form.content.trim()) return createToast('请填写正文内容')

      submitting.value = true
      try {
        await api.publish({
          title: form.title,
          category: form.category,
          content: form.content,
          summary: form.summary
        })
        createToast('投稿成功，等待审核')
        router.push('/my-articles')
      } catch (e) {
        createToast(e.message || '投稿失败')
      } finally {
        submitting.value = false
      }
    }

    onMounted(fetchCats)

    return { mode, form, cats, previewHtml, submitting, submit }
  }
}
</script>

<style scoped>
.publish { max-width: 720px; margin: 0 auto; padding: 14px 14px 30px; }
.page-title { font-family: var(--font-title); font-size: 20px; margin-bottom: 14px; }

.edit-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.edit-tab {
  padding: 8px 18px;
  font-size: 14px;
  color: var(--text-3);
  position: relative;
}
.edit-tab.active { color: var(--accent); font-weight: 600; }
.edit-tab.active::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: -1px;
  height: 2px;
  background: var(--accent);
}

.publish-form { padding: 20px 18px; }
.md-editor { font-size: 14px; line-height: 1.8; }
.publish-tip { text-align: center; font-size: 12px; color: var(--text-3); margin-top: 12px; }

.preview-area { padding: 20px 22px; }
.preview-title { font-family: var(--font-title); font-size: 20px; margin-bottom: 14px; }
</style>
