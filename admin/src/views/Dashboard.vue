<template>
  <div class="page">
    <!-- 顶部 6 个统计卡片 -->
    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.key" class="stat-card">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value">{{ formatNumber(totals[card.key]) }}</div>
      </div>
    </div>

    <div class="card-grid">
      <!-- 近7天活跃度：纯 CSS 柱状图 -->
      <div class="card">
        <div class="card-title">近7天活跃度</div>
        <div v-if="loading" class="loading-tip">加载中…</div>
        <div v-else-if="hasActivity" class="bar-chart">
          <div v-for="(count, i) in activity.counts" :key="i" class="bar-item">
            <div class="bar-value">{{ count }}</div>
            <div class="bar" :style="{ height: barHeight(count) }"></div>
            <div class="bar-label">{{ shortDate(activity.days[i]) }}</div>
          </div>
        </div>
        <div v-else class="empty">暂无活跃数据</div>
      </div>

      <!-- 分类分布：横向条形图 -->
      <div class="card">
        <div class="card-title">分类分布</div>
        <div v-if="loading" class="loading-tip">加载中…</div>
        <div v-else-if="categories.length" class="h-bar-list">
          <div v-for="cat in categories" :key="cat.name" class="h-bar-row">
            <span class="h-bar-name" :title="cat.name">{{ cat.name }}</span>
            <div class="h-bar-track">
              <div class="h-bar-fill" :style="{ width: catWidth(cat.count) }"></div>
            </div>
            <span class="h-bar-count">{{ cat.count }}</span>
          </div>
        </div>
        <div v-else class="empty">暂无分类数据</div>
      </div>
    </div>

    <!-- 热门文章 TOP10 -->
    <div class="card">
      <div class="card-title">
        热门文章 TOP10
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="loadStats">刷新</button>
      </div>
      <div v-if="loading" class="loading-tip">加载中…</div>
      <div v-else-if="topArticles.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 44px">排名</th>
              <th>标题</th>
              <th>分类</th>
              <th>作者</th>
              <th>阅读</th>
              <th>点赞</th>
              <th>评论</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(article, i) in topArticles" :key="article.id">
              <td>{{ i + 1 }}</td>
              <td class="td-title" :title="article.title">{{ article.title }}</td>
              <td><span class="badge badge-info">{{ article.category }}</span></td>
              <td>{{ article.author }}</td>
              <td>{{ article.views }}</td>
              <td>{{ article.likes }}</td>
              <td>{{ article.commentsCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">暂无热门文章</div>
    </div>
  </div>
</template>

<script setup>
/**
 * Dashboard.vue —— 数据监测
 * 展示统计卡片、近7天活跃度柱状图、分类分布条形图、热门文章 TOP10。
 */
import { ref, computed, onMounted } from 'vue'
import { getStats, showToast } from '../api'

const loading = ref(false)
const stats = ref(null)

// 统计卡片配置（key 对应后端 totals 字段）
const statCards = [
  { key: 'users', label: '用户数' },
  { key: 'articles', label: '文章数' },
  { key: 'pending', label: '待审核' },
  { key: 'views', label: '总阅读' },
  { key: 'likes', label: '总点赞' },
  { key: 'comments', label: '总评论' },
]

const totals = computed(() => (stats.value ? stats.value.totals : {}))
const activity = computed(() =>
  stats.value && stats.value.activity ? stats.value.activity : { days: [], counts: [] }
)
const categories = computed(() => (stats.value ? stats.value.categories || [] : []))
const topArticles = computed(() => (stats.value ? stats.value.top || [] : []))
const hasActivity = computed(() => activity.value.days && activity.value.days.length > 0)

// 数字格式化：超过 1 万显示为 x.x万
function formatNumber(n) {
  if (n === undefined || n === null) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}

// 柱高：按最大值归一化到百分比（保留最小高度 3%）
function barHeight(count) {
  const max = Math.max(...activity.value.counts, 1)
  return `${Math.max(Math.round((count / max) * 100), 3)}%`
}

// 条形宽度：按最大值归一化
function catWidth(count) {
  const max = Math.max(...categories.value.map((c) => c.count), 1)
  return `${Math.round((count / max) * 100)}%`
}

// 日期缩写：只保留 M-D
function shortDate(day) {
  if (!day) return ''
  const parts = String(day).split('-')
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : day
}

async function loadStats() {
  loading.value = true
  try {
    stats.value = await getStats()
  } catch (e) {
    // 接口失败提示错误，保留旧数据
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>
