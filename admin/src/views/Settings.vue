<template>
  <div class="page">
    <div v-if="loading" class="card"><div class="loading-tip">加载中…</div></div>
    <template v-else>
      <!-- 经验与金币规则 -->
      <div class="card">
        <div class="card-title">经验与金币规则</div>
        <div class="detail-grid">
          <div v-for="field in growthFields" :key="field.key" class="form-item">
            <label class="form-label">{{ field.label }}</label>
            <input
              v-model.number="growth[field.key]"
              class="input"
              type="number"
              :step="field.step || 1"
              :min="field.min !== undefined ? field.min : 0"
            />
            <p class="form-hint">{{ field.hint }}</p>
          </div>
        </div>
      </div>

      <!-- 推荐算法参数 -->
      <div class="card" style="margin-top: 16px">
        <div class="card-title">推荐算法参数</div>
        <div class="detail-grid">
          <div v-for="field in recommendFields" :key="field.key" class="form-item">
            <label class="form-label">{{ field.label }}</label>
            <input
              v-model.number="recommend[field.key]"
              class="input"
              type="number"
              :step="field.step || 1"
              :min="field.min !== undefined ? field.min : 0"
            />
            <p class="form-hint">{{ field.hint }}</p>
          </div>
        </div>
      </div>

      <!-- 保存 -->
      <div style="margin-top: 16px; text-align: right">
        <button class="btn btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Settings.vue —— 系统配置
 * 经验金币规则 + 推荐算法参数，两个分区表单，PUT /api/admin/config 保存。
 */
import { reactive, ref, onMounted } from 'vue'
import { getConfig, saveConfig, showToast } from '../api'

const loading = ref(false)
const saving = ref(false)

// 经验与金币规则字段配置（含中文说明）
const growthFields = [
  { key: 'readExp', label: '阅读经验', hint: '每阅读一篇获得的经验值' },
  { key: 'commentExp', label: '评论经验', hint: '每发表一条评论获得的经验值' },
  { key: 'publishExp', label: '发布经验', hint: '每发布（投稿通过）一篇获得的经验值' },
  { key: 'readCoins', label: '阅读金币', hint: '每阅读一篇获得的金币数' },
  { key: 'commentCoins', label: '评论金币', hint: '每发表一条评论获得的金币数' },
  { key: 'publishCoins', label: '发布金币', hint: '每发布（投稿通过）一篇获得的金币数' },
  { key: 'checkinCoins', label: '每日签到金币', hint: '每日签到可获得的固定金币数' },
  { key: 'dailyReadCoinLimit', label: '每日阅读金币上限', hint: '单日通过阅读累计可获得的金币上限' },
  { key: 'expPerLevel', label: '每级所需经验', hint: '升一级所需累计经验值', min: 1 },
]

// 推荐算法参数字段配置（含中文说明）
const recommendFields = [
  { key: 'pinnedWeight', label: '置顶权重', hint: '置顶文章在推荐中的加成权重' },
  { key: 'blueVWeight', label: '蓝V作者权重', hint: '蓝V认证作者文章的加成权重' },
  { key: 'yellowVWeight', label: '黄V作者权重', hint: '黄V认证作者文章的加成权重' },
  { key: 'likesWeight', label: '点赞权重', hint: '按点赞数计算的推荐权重' },
  { key: 'viewsWeight', label: '阅读权重', hint: '按阅读数计算的推荐权重，可为小数', step: 0.1 },
  { key: 'newWeight', label: '新文章权重', hint: '新发布文章的加成权重' },
  { key: 'verifyApplyCost', label: '黄V申请消耗金币', hint: '用户申请黄V认证需消耗的金币' },
  { key: 'pinCost', label: '置顶消耗金币', hint: '用户置顶文章需消耗的金币' },
  { key: 'recommendCost', label: '推荐消耗金币', hint: '用户购买推荐位需消耗的金币' },
]

// 表单数据（两个分区）
const growth = reactive({})
const recommend = reactive({})

async function loadConfig() {
  loading.value = true
  try {
    const cfg = await getConfig()
    // 用默认字段兜底，防止后端缺失字段时显示 undefined
    growthFields.forEach((f) => {
      growth[f.key] = cfg.growth ? cfg.growth[f.key] : 0
    })
    recommendFields.forEach((f) => {
      recommend[f.key] = cfg.recommend ? cfg.recommend[f.key] : 0
    })
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await saveConfig({ growth: { ...growth }, recommend: { ...recommend } })
    showToast('配置保存成功')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>
