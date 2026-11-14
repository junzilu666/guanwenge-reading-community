/**
 * growth.js —— 成长与经济系统
 * 经验/金币规则全部读取 data/config.json，可被后台「系统配置」动态调整。
 */
const store = require('./store');

/** 读取系统配置（含兜底默认值） */
function getConfig() {
  const def = {
    growth: {
      readExp: 2,
      commentExp: 5,
      publishExp: 20,
      readCoins: 1,
      commentCoins: 2,
      publishCoins: 5,
      checkinCoins: 2,
      dailyReadCoinLimit: 3, // 每日前 N 次阅读可领金币
      expPerLevel: 100,
    },
    recommend: {
      pinnedWeight: 100,
      blueVWeight: 10,
      yellowVWeight: 3,
      likesWeight: 2,
      viewsWeight: 0.5,
      newWeight: 5,
      verifyApplyCost: 30, // 黄V申请消耗金币
      pinCost: 20, // 文章短期置顶消耗金币
      recommendCost: 10, // 首页小额推荐位兑换金币
    },
  };
  const cfg = store.readJson(store.FILES.config, def);
  // 深层合并，防止配置缺字段
  cfg.growth = Object.assign({}, def.growth, cfg.growth || {});
  cfg.recommend = Object.assign({}, def.recommend, cfg.recommend || {});
  return cfg;
}

/** 保存系统配置 */
function saveConfig(cfg) {
  return store.writeJson(store.FILES.config, cfg);
}

/** 读取用户成长数据（缺文件自动补默认） */
function getGrowth(username) {
  const def = { exp: 0, coins: 0, checkinDates: [], readCount: 0, commentCount: 0, publishCount: 0 };
  return store.readUserJson(username, 'growth.json', def);
}

/** 写入用户成长数据 */
function saveGrowth(username, growth) {
  return store.writeUserJson(username, 'growth.json', growth);
}

/** 根据经验值计算等级与进度 */
function levelInfo(exp, expPerLevel) {
  expPerLevel = expPerLevel || 100;
  const level = Math.floor(exp / expPerLevel) + 1;
  const expInLevel = exp % expPerLevel;
  return { level, expInLevel, expToNext: expPerLevel, totalExp: exp };
}

/** 追加经验与金币（正值增加，负值扣减；金币不允许为负） */
function applyGrowth(username, { exp = 0, coins = 0 }) {
  const g = getGrowth(username);
  g.exp = Math.max(0, (g.exp || 0) + exp);
  g.coins = Math.max(0, (g.coins || 0) + coins);
  saveGrowth(username, g);
  return g;
}

/** 每日打卡：成功返回增加的金币，重复打卡返回 null */
function dailyCheckin(username) {
  const cfg = getConfig();
  const g = getGrowth(username);
  const today = store.todayStr();
  const dates = Array.isArray(g.checkinDates) ? g.checkinDates : [];
  if (dates.includes(today)) return null;
  dates.push(today);
  g.checkinDates = dates;
  g.coins = (g.coins || 0) + cfg.growth.checkinCoins;
  saveGrowth(username, g);
  return cfg.growth.checkinCoins;
}

/** 记录一次阅读：加经验 + 每日前 N 次加金币，返回 {exp, coins} */
function applyRead(username) {
  const cfg = getConfig();
  const g = getGrowth(username);
  const today = store.todayStr();
  let coins = 0;
  // 统计今天已阅读次数
  let todayReads = 0;
  if (Array.isArray(g.readDates)) {
    todayReads = g.readDates.filter((d) => d === today).length;
  } else {
    g.readDates = [];
  }
  g.exp = (g.exp || 0) + cfg.growth.readExp;
  g.readCount = (g.readCount || 0) + 1;
  if (todayReads < cfg.growth.dailyReadCoinLimit) {
    coins = cfg.growth.readCoins;
    g.coins = (g.coins || 0) + coins;
  }
  g.readDates.push(today);
  // 只保留最近 60 天记录，防止膨胀
  if (g.readDates.length > 60) g.readDates = g.readDates.slice(-60);
  saveGrowth(username, g);
  return { exp: cfg.growth.readExp, coins };
}

/** 记录一次评论奖励 */
function applyComment(username) {
  const cfg = getConfig();
  const g = getGrowth(username);
  g.exp = (g.exp || 0) + cfg.growth.commentExp;
  g.coins = (g.coins || 0) + cfg.growth.commentCoins;
  g.commentCount = (g.commentCount || 0) + 1;
  saveGrowth(username, g);
  return { exp: cfg.growth.commentExp, coins: cfg.growth.commentCoins };
}

/** 发布/投稿通过奖励 */
function applyPublish(username) {
  const cfg = getConfig();
  const g = getGrowth(username);
  g.exp = (g.exp || 0) + cfg.growth.publishExp;
  g.coins = (g.coins || 0) + cfg.growth.publishCoins;
  g.publishCount = (g.publishCount || 0) + 1;
  saveGrowth(username, g);
  return { exp: cfg.growth.publishExp, coins: cfg.growth.publishCoins };
}

/** 读取用户完整资料（含成长、认证）——用于前端「我的」页面 */
function getUserProfile(username) {
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const user = base.users.find((u) => u.username === username) || { username, nickname: username, status: 'active' };
  const profile = store.readUserJson(username, 'profile.json', {
    nickname: user.nickname || username,
    avatar: '',
    bio: '',
    verify: { blue: false, yellow: false, pending: false },
  });
  const growth = getGrowth(username);
  const cfg = getConfig();
  const li = levelInfo(growth.exp, cfg.growth.expPerLevel);
  return {
    username,
    nickname: profile.nickname || user.nickname || username,
    avatar: profile.avatar || '',
    bio: profile.bio || '',
    status: user.status || 'active',
    createdAt: user.createdAt || '',
    verify: profile.verify || { blue: false, yellow: false, pending: false },
    growth: {
      ...li,
      coins: growth.coins || 0,
      readCount: growth.readCount || 0,
      commentCount: growth.commentCount || 0,
      publishCount: growth.publishCount || 0,
      checkedInToday: Array.isArray(growth.checkinDates) && growth.checkinDates.includes(store.todayStr()),
    },
  };
}

/** 扣除金币（返回是否成功） */
function spendCoins(username, amount) {
  const g = getGrowth(username);
  if ((g.coins || 0) < amount) return false;
  g.coins -= amount;
  saveGrowth(username, g);
  return true;
}

module.exports = {
  getConfig,
  saveConfig,
  getGrowth,
  saveGrowth,
  levelInfo,
  applyGrowth,
  dailyCheckin,
  applyRead,
  applyComment,
  applyPublish,
  getUserProfile,
  spendCoins,
};
