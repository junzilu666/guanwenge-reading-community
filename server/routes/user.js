/**
 * routes/user.js —— 用户中心：资料 / 收藏 / 历史 / 打卡 / 投稿 / 黄V申请
 */
const express = require('express');
const store = require('../lib/store');
const auth = require('../lib/auth');
const growth = require('../lib/growth');
const art = require('../lib/articles');

const router = express.Router();

/** 查询 / 修改个人资料 */
router.get('/profile', auth.requireUser, (req, res) => {
  res.json({ code: 0, data: growth.getUserProfile(req.user.username) });
});

router.put('/profile', auth.requireUser, (req, res) => {
  const { nickname, avatar, bio } = req.body || {};
  const profile = store.readUserJson(req.user.username, 'profile.json', {});
  if (nickname !== undefined) {
    const n = String(nickname).trim().slice(0, 20);
    if (!n) return res.json({ code: 1, msg: '昵称不能为空' });
    profile.nickname = n;
    // 同步 base_user 中的昵称
    const base = store.readJson(store.FILES.baseUser, { users: [] });
    const u = base.users.find((x) => x.username === req.user.username);
    if (u) { u.nickname = n; store.writeJson(store.FILES.baseUser, base); }
  }
  if (avatar !== undefined) profile.avatar = String(avatar).slice(0, 500);
  if (bio !== undefined) profile.bio = String(bio).slice(0, 100);
  store.writeUserJson(req.user.username, 'profile.json', profile);
  store.log('info', `用户 ${req.user.username} 修改资料`);
  res.json({ code: 0, data: growth.getUserProfile(req.user.username) });
});

/** 收藏列表 */
router.get('/favorites', auth.requireUser, (req, res) => {
  const favs = store.readUserJson(req.user.username, 'favorites.json', []);
  const index = art.getIndex();
  const list = (Array.isArray(favs) ? favs : [])
    .map((id) => index.articles.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => art.toArticleView(a, req.user.username));
  res.json({ code: 0, data: list });
});

/** 切换收藏（收藏/取消收藏） */
router.post('/favorites', auth.requireUser, (req, res) => {
  const { articleId } = req.body || {};
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === articleId);
  if (!article) return res.json({ code: 1, msg: '文章不存在' });
  let favs = store.readUserJson(req.user.username, 'favorites.json', []);
  if (!Array.isArray(favs)) favs = [];
  let favorited;
  if (favs.includes(articleId)) {
    favs = favs.filter((id) => id !== articleId);
    favorited = false;
  } else {
    favs.unshift(articleId);
    favorited = true;
  }
  store.writeUserJson(req.user.username, 'favorites.json', favs);
  res.json({ code: 0, data: { favorited, count: favs.length } });
});

/** 阅读历史 */
router.get('/history', auth.requireUser, (req, res) => {
  const history = store.readUserJson(req.user.username, 'history.json', []);
  res.json({ code: 0, data: Array.isArray(history) ? history : [] });
});

/** 清空阅读历史 */
router.delete('/history', auth.requireUser, (req, res) => {
  store.writeUserJson(req.user.username, 'history.json', []);
  res.json({ code: 0, data: true });
});

/** 每日阅读打卡领金币 */
router.post('/checkin', auth.requireUser, (req, res) => {
  const coins = growth.dailyCheckin(req.user.username);
  if (coins === null) return res.json({ code: 1, msg: '今天已经打过卡啦，明天再来吧' });
  store.log('info', `用户 ${req.user.username} 打卡成功 +${coins}金币`);
  res.json({ code: 0, data: { coins, growth: growth.getGrowth(req.user.username) } });
});

/** 成长数据（等级/经验/金币/V标） */
router.get('/stats', auth.requireUser, (req, res) => {
  res.json({ code: 0, data: growth.getUserProfile(req.user.username) });
});

/** 投稿文章（进入待审核状态） */
router.post('/articles', auth.requireUser, (req, res) => {
  const { title, category, content, summary } = req.body || {};
  if (!title || !title.trim()) return res.json({ code: 1, msg: '标题不能为空' });
  if (!content || !content.trim()) return res.json({ code: 1, msg: '正文不能为空' });

  const article = art.createArticle({
    title,
    category,
    content,
    summary,
    author: growth.getUserProfile(req.user.username).nickname,
    authorVerify: '',
    status: 'pending', // 投稿默认待审核
    isUser: true,
    username: req.user.username,
  });
  if (!article) return res.json({ code: 1, msg: '投稿失败，请重试' });
  store.log('info', `用户 ${req.user.username} 投稿文章: ${title}`);
  res.json({ code: 0, data: article });
});

/** 我的文章列表（含审核状态） */
router.get('/articles', auth.requireUser, (req, res) => {
  const index = art.getIndex();
  const list = index.articles
    .filter((a) => a.isUser && a.username === req.user.username)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((a) => art.toArticleView(a, req.user.username));
  res.json({ code: 0, data: list });
});

/** 黄V申请（消耗金币，进入管理员审核） */
router.post('/verify-apply', auth.requireUser, (req, res) => {
  const profile = store.readUserJson(req.user.username, 'profile.json', {});
  if (profile.verify && profile.verify.blue) return res.json({ code: 1, msg: '您已是蓝V官方认证，无需申请' });
  if (profile.verify && profile.verify.yellow) return res.json({ code: 1, msg: '您已是黄V认证创作者' });
  if (profile.verify && profile.verify.pending) return res.json({ code: 1, msg: '申请审核中，请耐心等待' });

  const cfg = growth.getConfig();
  const cost = cfg.recommend.verifyApplyCost;
  if (!growth.spendCoins(req.user.username, cost)) {
    return res.json({ code: 1, msg: `金币不足，黄V申请需 ${cost} 金币` });
  }
  profile.verify = profile.verify || {};
  profile.verify.pending = true;
  store.writeUserJson(req.user.username, 'profile.json', profile);

  const apps = store.readJson(store.FILES.applications, { list: [] });
  if (!Array.isArray(apps.list)) apps.list = [];
  if (!apps.list.some((x) => x.username === req.user.username && x.status === 'pending')) {
    apps.list.push({ username: req.user.username, time: store.nowStr(), status: 'pending' });
    store.writeJson(store.FILES.applications, apps);
  }
  store.log('info', `用户 ${req.user.username} 提交黄V申请`);
  res.json({ code: 0, data: true });
});

module.exports = router;
