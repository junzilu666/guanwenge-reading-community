<template>
  <div class="page">
    <!-- 汇总卡片 -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-num">{{ summary.count }}</div>
        <div class="stat-label">累计打赏笔数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num accent">{{ summary.totalAmount }} 元</div>
        <div class="stat-label">累计打赏金额</div>
      </div>
    </div>

    <!-- 手动录入打赏 -->
    <div class="card">
      <div class="card-title">手动录入打赏记录</div>
      <p class="form-hint">仅用于登记线下/微信收款到的自愿打赏，不涉及金币扣费，也不接入任何线上支付。</p>
      <div class="detail-grid">
        <div class="form-item">
          <label class="form-label">打赏金额（元）*</label>
          <input v-model.number="form.amount" class="input" type="number" min="0.01" step="0.01" placeholder="如 5.20" />
        </div>
        <div class="form-item">
          <label class="form-label">打赏昵称</label>
          <input v-model.trim="form.name" class="input" type="text" placeholder="匿名" maxlength="20" />
        </div>
        <div class="form-item">
          <label class="form-label">备注</label>
          <input v-model.trim="form.note" class="input" type="text" placeholder="选填，如：感谢支持" maxlength="100" />
        </div>
      </div>
      <div style="margin-top: 12px; text-align: right">
        <button class="btn btn-primary" :disabled="saving" @click="handleAdd">
          {{ saving ? '录入中…' : '录入记录' }}
        </button>
      </div>
    </div>

    <!-- 打赏记录列表 -->
    <div class="card" style="margin-top: 16px">
      <div class="card-title">打赏记录</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>金额</th>
              <th>昵称</th>
              <th>备注</th>
              <th style="min-width: 120px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="loading-tip">加载中…</td>
            </tr>
            <tr v-else-if="!records.length">
              <td colspan="5" class="empty">暂无打赏记录</td>
            </tr>
            <tr v-for="r in records" :key="r.id">
              <td>{{ r.time }}</td>
              <td><strong class="amount">¥{{ r.amount }}</strong></td>
              <td>{{ r.name }}</td>
              <td class="td-ellipsis" :title="r.note">{{ r.note || '-' }}</td>
              <td>
                <div class="ops">
                  <button class="btn btn-ghost-danger btn-sm" @click="handleDelete(r)">删除</button>
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
 * Rewards.vue —— 打赏统计
 * 仅支持管理员手动录入打赏记录（GET/POST/DELETE /api/admin/rewards），
 * 数据存储于 server/system/reward.json，不涉及金币扣费。
 */
import { reactive, ref, onMounted } from 'vue'
import { getRewards, addReward, deleteReward, showToast } from '../api'

const loading = ref(false)
const saving = ref(false)
const records = ref([])
const summary = reactive({ count: 0, totalAmount: 0 })
const form = reactive({ amount: null, name: '', note: '' })

async function load() {
  loading.value = true
  try {
    const data = await getRewards()
    records.value = data.records || []
    summary.count = data.count || 0
    summary.totalAmount = data.totalAmount || 0
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  const amt = Number(form.amount)
  if (!amt || amt <= 0) {
    showToast('请填写正确的打赏金额', 'error')
    return
  }
  saving.value = true
  try {
    await addReward({ amount: amt, name: form.name, note: form.note })
    showToast('录入成功')
    form.amount = null
    form.name = ''
    form.note = ''
    load()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

function handleDelete(r) {
  if (!window.confirm(`确定删除 ${r.time} 的 ¥${r.amount} 打赏记录吗？`)) return
  deleteReward(r.id)
    .then(() => {
      showToast('已删除')
      load()
    })
    .catch((e) => showToast(e.message, 'error'))
}

onMounted(load)
</script>

<style scoped>
/* 汇总卡片 */
.stat-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e5e0d5);
  border-radius: 6px;
  padding: 18px 16px;
  text-align: center;
}
.stat-num {
  font-size: 26px;
  font-weight: 700;
  color: var(--text, #2b2b28);
  font-variant-numeric: tabular-nums;
}
.stat-num.accent { color: var(--accent, #b03a2e); }
.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-2, #6b675f);
}
.amount { color: var(--accent, #b03a2e); }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}
@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
