/**
 * routes/admin.js —— 后台管理系统接口
 * 固定账号 admin / admin，登录校验写在后端逻辑，token 分离于普通用户。
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../lib/store');
const auth = require('../lib/auth');
const growth = require('../lib/growth');
const art = require('../lib/articles');

const router = express.Router();

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

/** 管理员登录（固定账号密码，不可修改） */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = auth.createSession('admin', ADMIN_USER);
    store.log('info', '管理员登录后台');
    return res.json({ code: 0, data: { token, username: ADMIN_USER } });
  }
  res.json({ code: 1, msg: '管理员账号或密码错误' });
});

/* ================= 数据监测 ================= */
router.get('/stats', auth.requireAdmin, (req, res) => {
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const index = art.getIndex();
  const likes = art.getLikes();
  const comments = art.getComments();

  const published = index.articles.filter((a) => a.status === 'published');
  const totalViews = published.reduce((s, a) => s + (a.views || 0), 0);
  const totalLikes = Object.values(likes).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
  const totalComments = Object.values(comments).reduce(
    (s, arr) => s + (Array.isArray(arr) ? arr.filter((c) => c.status !== 'removed').length : 0), 0
  );

  // 近7天用户活跃度（按阅读历史时间统计）
  const days = [];
  const activeCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push(key);
    activeCounts.push(0);
  }
  // 通过历史记录粗略统计每日活跃
  base.users.forEach((u) => {
    const history = store.readUserJson(u.username, 'history.json', []);
    (Array.isArray(history) ? history : []).forEach((h) => {
      const day = String(h.time || '').slice(0, 10);
      const idx = days.indexOf(day);
      if (idx >= 0) activeCounts[idx]++;
    });
  });

  // 分类分布
  const catMap = {};
  published.forEach((a) => { const c = a.category || '未分类'; catMap[c] = (catMap[c] || 0) + 1; });
  const categories = Object.keys(catMap).map((name) => ({ name, count: catMap[name] }));

  // 热门文章 TOP10
  const top = [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10)
    .map((a) => art.toArticleView(a, ''));

  res.json({
    code: 0,
    data: {
      totals: {
        users: base.users.length,
        articles: published.length,
        pending: index.articles.filter((a) => a.status === 'pending').length,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
      },
      activity: { days, counts: activeCounts },
      categories,
      top,
    },
  });
});

/* ================= 用户管理 ================= */
/** 全部用户列表（附成长/认证信息） */
router.get('/users', auth.requireAdmin, (req, res) => {
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const data = base.users.map((u) => {
    const profile = store.readUserJson(u.username, 'profile.json', { verify: { blue: false, yellow: false } });
    const growthData = growth.getGrowth(u.username);
    const li = growth.levelInfo(growthData.exp, growth.getConfig().growth.expPerLevel);
    return {
      username: u.username,
      nickname: profile.nickname || u.nickname || u.username,
      createdAt: u.createdAt || '',
      status: u.status || 'active',
      verify: profile.verify || { blue: false, yellow: false },
      level: li.level,
      exp: growthData.exp,
      coins: growthData.coins,
    };
  });
  res.json({ code: 0, data });
});

/** 管理员后台创建用户（等同注册，自动生成用户独立文件夹） */
router.post('/users', auth.requireAdmin, (req, res) => {
  const { username, password, nickname } = req.body || {};
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_]{2,16}$/.test(username || '')) {
    return res.json({ code: 1, msg: '用户名需为2-16位中文/字母/数字/下划线' });
  }
  if (!password || String(password).length < 4) return res.json({ code: 1, msg: '密码至少4位' });

  const base = store.readJson(store.FILES.baseUser, { users: [] });
  if (base.users.some((u) => u.username === username)) {
    return res.json({ code: 1, msg: '该用户名已被注册' });
  }
  base.users.push({
    username,
    password: String(password),
    nickname: (nickname && nickname.trim()) || username,
    createdAt: store.nowStr(),
    status: 'active',
  });
  if (!store.writeJson(store.FILES.baseUser, base)) return res.json({ code: 1, msg: '创建失败，请重试' });
  store.createUserFolder(username); // 自动生成 /users/用户名/ 独立文件夹
  store.log('info', `管理员后台创建用户: ${username}`);
  res.json({ code: 0, data: { username, nickname: (nickname && nickname.trim()) || username, status: 'active' } });
});

/** 查看用户文件夹内全部数据 */
router.get('/users/:username', auth.requireAdmin, (req, res) => {
  const username = req.params.username;
  const dir = store.userDir(username);
  if (!fs.existsSync(dir)) return res.json({ code: 1, msg: '用户文件夹不存在' });

  const profile = store.readUserJson(username, 'profile.json', {});
  const growthData = growth.getGrowth(username);
  const favorites = store.readUserJson(username, 'favorites.json', []);
  const history = store.readUserJson(username, 'history.json', []);
  const comments = store.readUserJson(username, 'comments.json', []);

  // 用户发布的文稿
  const index = art.getIndex();
  const myArticles = index.articles
    .filter((a) => a.isUser && a.username === username)
    .map((a) => art.toArticleView(a, ''));

  // 文件夹内文件清单
  const walk = (d, rel) => {
    const out = [];
    (store.listDir(d) || []).forEach((f) => {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        out.push({ name: rel ? `${rel}/${f}/` : `${f}/`, type: 'dir', children: walk(full, rel ? `${rel}/${f}` : f) });
      } else {
        out.push({ name: rel ? `${rel}/${f}` : f, type: 'file', size: stat.size });
      }
    });
    return out;
  };

  const li = growth.levelInfo(growthData.exp, growth.getConfig().growth.expPerLevel);
  res.json({
    code: 0,
    data: {
      username,
      profile,
      growth: { ...li, coins: growthData.coins, readCount: growthData.readCount, commentCount: growthData.commentCount, publishCount: growthData.publishCount },
      favorites: Array.isArray(favorites) ? favorites : [],
      history: (Array.isArray(history) ? history : []).slice(0, 50),
      comments: (Array.isArray(comments) ? comments : []).slice(0, 100),
      articles: myArticles,
      fileTree: walk(dir, ''),
    },
  });
});

/** 封禁 / 解封账号 */
router.post('/users/:username/ban', auth.requireAdmin, (req, res) => banUser(req, res, 'banned'));
router.post('/users/:username/unban', auth.requireAdmin, (req, res) => banUser(req, res, 'active'));

function banUser(req, res, status) {
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const user = base.users.find((u) => u.username === req.params.username);
  if (!user) return res.json({ code: 1, msg: '用户不存在' });
  user.status = status;
  store.writeJson(store.FILES.baseUser, base);
  store.log('info', `管理员${status === 'banned' ? '封禁' : '解封'}用户 ${user.username}`);
  res.json({ code: 0, data: { username: user.username, status } });
}

/** 授予 / 撤销蓝V黄V认证 */
router.post('/users/:username/verify', auth.requireAdmin, (req, res) => {
  const { type, action } = req.body || {};
  if (!['blue', 'yellow'].includes(type)) return res.json({ code: 1, msg: '认证类型不正确' });
  if (!['grant', 'revoke'].includes(action)) return res.json({ code: 1, msg: '操作类型不正确' });

  const profile = store.readUserJson(req.params.username, 'profile.json', { verify: { blue: false, yellow: false } });
  if (!profile.verify) profile.verify = {};
  if (action === 'grant') {
    profile.verify[type] = true;
    if (type === 'yellow') profile.verify.pending = false; // 通过后清除待审标记
  } else {
    profile.verify[type] = false;
  }
  store.writeUserJson(req.params.username, 'profile.json', profile);
  store.log('info', `管理员${action === 'grant' ? '授予' : '撤销'} ${req.params.username} 的${type === 'blue' ? '蓝V' : '黄V'}认证`);
  res.json({ code: 0, data: profile.verify });
});

/** 调整用户金币（运营补给） */
router.post('/users/:username/coins', auth.requireAdmin, (req, res) => {
  const amount = parseInt((req.body || {}).amount, 10);
  if (isNaN(amount) || amount === 0) return res.json({ code: 1, msg: '金额无效' });
  const g = growth.applyGrowth(req.params.username, { coins: amount });
  store.log('info', `管理员调整 ${req.params.username} 金币 ${amount > 0 ? '+' : ''}${amount}`);
  res.json({ code: 0, data: { coins: g.coins } });
});

/** 删除用户：账号 + 独立文件夹 + 其点赞/评论/投稿文章/黄V申请 全部清除 */
router.delete('/users/:username', auth.requireAdmin, (req, res) => {
  const username = req.params.username;

  // 1. 从公共账号库移除
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const idx = base.users.findIndex((u) => u.username === username);
  if (idx < 0) return res.json({ code: 1, msg: '用户不存在' });
  base.users.splice(idx, 1);
  store.writeJson(store.FILES.baseUser, base);

  // 2. 删除用户独立文件夹（Windows 下用递归逐项删除，避免 rmSync 对中文路径失效）
  const dir = store.userDir(username);
  store.removeDirRecursive(dir);

  // 3. 清理该用户的点赞记录
  const likes = art.getLikes();
  Object.keys(likes).forEach((aid) => {
    if (Array.isArray(likes[aid])) likes[aid] = likes[aid].filter((u) => u !== username);
  });
  art.saveLikes(likes);

  // 4. 删除该用户的全部评论
  const comments = art.getComments();
  Object.keys(comments).forEach((aid) => {
    if (Array.isArray(comments[aid])) comments[aid] = comments[aid].filter((c) => c.user !== username);
  });
  art.saveComments(comments);

  // 5. 删除该用户投稿的文章（含正文文件）
  const index = art.getIndex();
  const mine = index.articles.filter((a) => a.isUser && a.username === username);
  index.articles = index.articles.filter((a) => !(a.isUser && a.username === username));
  art.saveIndex(index);
  mine.forEach((a) => store.removeFile(art.articleFile(a.id)));

  // 6. 清理该用户的黄V申请记录
  const apps = store.readJson(store.FILES.applications, { list: [] });
  apps.list = (Array.isArray(apps.list) ? apps.list : []).filter((x) => x.username !== username);
  store.writeJson(store.FILES.applications, apps);

  store.log('info', `管理员删除用户 ${username}（含其文件夹与关联数据）`);
  res.json({ code: 0, data: { username } });
});

/* ================= 内容管理 ================= */
/** 全部文章（含待审/下架） */
router.get('/articles', auth.requireAdmin, (req, res) => {
  const index = art.getIndex();
  const kw = ((req.query.keyword || '')).trim().toLowerCase();
  let list = index.articles;
  if (kw) list = list.filter((a) => [a.title, a.author, a.category].join(' ').toLowerCase().includes(kw));
  const data = list
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((a) => ({ ...art.toArticleView(a, ''), content: art.readContent(a).slice(0, 200) }));
  res.json({ code: 0, data });
});

/** 发布新文章（上传 MD 内容；可选指定某用户作为作者） */
router.post('/articles', auth.requireAdmin, (req, res) => {
  const { title, category, content, summary, cover, author, username } = req.body || {};
  if (!title || !title.trim()) return res.json({ code: 1, msg: '标题不能为空' });
  if (!content || !content.trim()) return res.json({ code: 1, msg: '正文不能为空' });

  // 作者署名：优先取后台下拉选中的用户（昵称 + 该用户认证V标）；否则官方默认蓝V
  let authorName = (author && author.trim()) || '观文阁编辑部';
  let authorVerify = 'blue';
  if (username) {
    const base = store.readJson(store.FILES.baseUser, { users: [] });
    const u = base.users.find((x) => x.username === username);
    if (u) {
      const profile = store.readUserJson(username, 'profile.json', {
        nickname: u.nickname || username,
        verify: { blue: false, yellow: false },
      });
      authorName = profile.nickname || u.nickname || username;
      const v = profile.verify || {};
      authorVerify = v.blue ? 'blue' : (v.yellow ? 'yellow' : '');
    }
  }

  const article = art.createArticle({
    title,
    category: category || '未分类',
    content,
    summary,
    cover,
    author: authorName,
    authorVerify,
    status: 'published',
    isUser: false,
  });
  if (!article) return res.json({ code: 1, msg: '发布失败' });
  res.json({ code: 0, data: art.toArticleView(article, '') });
});

/** 编辑文章：上架/下架/置顶/分类/标题/封面/正文 */
router.put('/articles/:id', auth.requireAdmin, (req, res) => {
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === req.params.id);
  if (!article) return res.json({ code: 1, msg: '文章不存在' });
  const b = req.body || {};
  if (b.title !== undefined && String(b.title).trim()) article.title = String(b.title).trim();
  if (b.category !== undefined && String(b.category).trim()) article.category = String(b.category).trim();
  if (b.summary !== undefined) article.summary = String(b.summary).slice(0, 120);
  if (b.cover !== undefined) article.cover = String(b.cover);
  // 作者：与发布接口一致——指定 username 则自动带上该用户的昵称与认证V标；
  // 只传署名文本时按署名处理（官方蓝V，其余无V），避免编辑后V标残留/丢失
  if (b.username !== undefined && String(b.username).trim()) {
    const base = store.readJson(store.FILES.baseUser, { users: [] });
    const u = base.users.find((x) => x.username === String(b.username).trim());
    if (u) {
      const profile = store.readUserJson(u.username, 'profile.json', {
        nickname: u.nickname || u.username,
        verify: { blue: false, yellow: false },
      });
      article.author = profile.nickname || u.nickname || u.username;
      const v = profile.verify || {};
      article.authorVerify = v.blue ? 'blue' : (v.yellow ? 'yellow' : '');
    }
  } else if (b.author !== undefined && String(b.author).trim()) {
    article.author = String(b.author).trim();
    article.authorVerify = article.author === '观文阁编辑部' ? 'blue' : '';
  }
  if (b.status !== undefined && ['published', 'offline', 'pending', 'rejected'].includes(b.status)) article.status = b.status;
  if (b.pinned !== undefined) article.pinned = !!b.pinned;
  if (b.recommended !== undefined) article.recommended = !!b.recommended;
  if (b.content !== undefined) {
    store.writeText(art.articleFile(article.id), String(b.content));
    if (!b.summary) article.summary = art.makeSummary(b.content, article.summary);
  }
  article.updatedAt = store.nowStr();
  art.saveIndex(index);
  store.log('info', `管理员编辑文章 ${article.id} (${article.title})`);
  res.json({ code: 0, data: art.toArticleView(article, '') });
});

/** 删除文章 */
router.delete('/articles/:id', auth.requireAdmin, (req, res) => {
  const index = art.getIndex();
  const i = index.articles.findIndex((a) => a.id === req.params.id);
  if (i < 0) return res.json({ code: 1, msg: '文章不存在' });
  const [removed] = index.articles.splice(i, 1);
  art.saveIndex(index);
  store.removeFile(art.articleFile(removed.id));
  const likes = art.getLikes();
  delete likes[removed.id];
  art.saveLikes(likes);
  const comments = art.getComments();
  delete comments[removed.id];
  art.saveComments(comments);
  store.log('info', `管理员删除文章 ${removed.title} (${removed.id})`);
  res.json({ code: 0, data: { id: removed.id } });
});

/** 审核投稿文章 */
router.post('/articles/:id/review', auth.requireAdmin, (req, res) => {
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === req.params.id);
  if (!article) return res.json({ code: 1, msg: '文章不存在' });
  const action = (req.body || {}).action; // approve | reject
  if (action === 'approve') {
    article.status = 'published';
    art.saveIndex(index);
    // 投稿通过奖励
    if (article.isUser && article.username) {
      growth.applyPublish(article.username);
      store.log('info', `投稿通过 ${article.id}，用户 ${article.username} 获得发布奖励`);
    }
  } else if (action === 'reject') {
    article.status = 'rejected';
    art.saveIndex(index);
  } else {
    return res.json({ code: 1, msg: '操作不正确' });
  }
  res.json({ code: 0, data: art.toArticleView(article, '') });
});

/** 批量导入：扫描 server/imports/ 目录下的 .md 文件并发布 */
router.post('/import', auth.requireAdmin, (req, res) => {
  const files = store.listDir(store.IMPORTS_DIR, '.md');
  let imported = 0;
  const failed = [];
  files.forEach((f) => {
    const full = path.join(store.IMPORTS_DIR, f);
    const content = store.readText(full);
    if (!content.trim()) { failed.push(f); return; }
    const title = f.replace(/\.md$/i, '').trim();
    const article = art.createArticle({
      title,
      category: '未分类',
      content,
      author: '观文阁编辑部',
      authorVerify: 'blue',
      status: 'published',
      isUser: false,
    });
    if (article) { imported++; store.removeFile(full); }
    else failed.push(f);
  });
  store.log('info', `批量导入完成：成功 ${imported} 篇${failed.length ? `，失败 ${failed.length} 篇` : ''}`);
  res.json({ code: 0, data: { imported, failed } });
});

/** 获取导入目录文件清单（供批量导入预览） */
router.get('/import', auth.requireAdmin, (req, res) => {
  const files = store.listDir(store.IMPORTS_DIR, '.md');
  res.json({ code: 0, data: files.map((f) => ({ file: f, title: f.replace(/\.md$/i, '') })) });
});

/* ================= 评论审核 ================= */
router.get('/comments', auth.requireAdmin, (req, res) => {
  const all = art.getComments();
  const list = [];
  Object.keys(all).forEach((aid) => {
    (Array.isArray(all[aid]) ? all[aid] : []).forEach((c) => {
      list.push({ ...c, articleId: aid });
    });
  });
  list.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json({ code: 0, data: list });
});

/** 删除违规评论 */
router.delete('/comments/:id', auth.requireAdmin, (req, res) => {
  const all = art.getComments();
  let found = false;
  Object.keys(all).forEach((aid) => {
    const arr = all[aid];
    const c = Array.isArray(arr) ? arr.find((x) => x.id === req.params.id) : null;
    if (c) { c.status = 'removed'; found = true; }
  });
  if (!found) return res.json({ code: 1, msg: '评论不存在' });
  art.saveComments(all);
  store.log('info', `管理员删除违规评论 ${req.params.id}`);
  res.json({ code: 0, data: true });
});

/* ================= 黄V申请审核 ================= */
router.get('/applications', auth.requireAdmin, (req, res) => {
  const apps = store.readJson(store.FILES.applications, { list: [] });
  res.json({ code: 0, data: Array.isArray(apps.list) ? apps.list : [] });
});

router.post('/applications/:username', auth.requireAdmin, (req, res) => {
  const username = req.params.username;
  const action = (req.body || {}).action; // approve | reject
  const profile = store.readUserJson(username, 'profile.json', { verify: { blue: false, yellow: false } });
  if (!profile.verify) profile.verify = {};
  if (action === 'approve') {
    profile.verify.yellow = true;
    profile.verify.pending = false;
    store.writeUserJson(username, 'profile.json', profile);
    store.log('info', `管理员通过 ${username} 的黄V申请`);
  } else if (action === 'reject') {
    profile.verify.pending = false;
    store.writeUserJson(username, 'profile.json', profile);
    store.log('info', `管理员驳回 ${username} 的黄V申请`);
  } else {
    return res.json({ code: 1, msg: '操作不正确' });
  }
  const apps = store.readJson(store.FILES.applications, { list: [] });
  if (Array.isArray(apps.list)) {
    const a = apps.list.find((x) => x.username === username);
    if (a) a.status = action === 'approve' ? 'approved' : 'rejected';
    store.writeJson(store.FILES.applications, apps);
  }
  res.json({ code: 0, data: profile.verify });
});

/* ================= 打赏统计（仅管理员手动录入，无金币扣费） ================= */
/** 打赏记录列表 + 汇总 */
router.get('/rewards', auth.requireAdmin, (req, res) => {
  const data = store.readJson(store.FILES.reward, { records: [] });
  const records = Array.isArray(data.records) ? data.records : [];
  const totalAmount = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  res.json({ code: 0, data: { records, count: records.length, totalAmount } });
});

/** 手动录入打赏记录 */
router.post('/rewards', auth.requireAdmin, (req, res) => {
  const { amount, name, note } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0 || amt > 1000000) return res.json({ code: 1, msg: '打赏金额无效（需大于0）' });
  const data = store.readJson(store.FILES.reward, { records: [] });
  if (!Array.isArray(data.records)) data.records = [];
  const record = {
    id: store.genId('r'),
    amount: amt,
    name: String(name || '匿名').slice(0, 20),
    note: String(note || '').slice(0, 100),
    time: store.nowStr(),
  };
  data.records.unshift(record);
  store.writeJson(store.FILES.reward, data);
  store.log('info', `管理员录入打赏记录 ${record.name} +${amt}元`);
  res.json({ code: 0, data: record });
});

/** 删除打赏记录（录入错误纠正） */
router.delete('/rewards/:id', auth.requireAdmin, (req, res) => {
  const data = store.readJson(store.FILES.reward, { records: [] });
  const before = Array.isArray(data.records) ? data.records.length : 0;
  data.records = (Array.isArray(data.records) ? data.records : []).filter((r) => r.id !== req.params.id);
  if (data.records.length === before) return res.json({ code: 1, msg: '记录不存在' });
  store.writeJson(store.FILES.reward, data);
  store.log('info', `管理员删除打赏记录 ${req.params.id}`);
  res.json({ code: 0, data: true });
});

/* ================= 系统配置 ================= */
router.get('/config', auth.requireAdmin, (req, res) => {
  res.json({ code: 0, data: growth.getConfig() });
});

router.put('/config', auth.requireAdmin, (req, res) => {
  const body = req.body || {};
  const cfg = growth.getConfig();
  if (body.growth) cfg.growth = Object.assign({}, cfg.growth, body.growth);
  if (body.recommend) cfg.recommend = Object.assign({}, cfg.recommend, body.recommend);
  growth.saveConfig(cfg);
  store.log('info', '管理员修改系统配置');
  res.json({ code: 0, data: cfg });
});

/** 系统日志 */
router.get('/logs', auth.requireAdmin, (req, res) => {
  const raw = store.readText(store.FILES.log);
  const lines = raw.split('\n').filter(Boolean).reverse().slice(0, 200);
  res.json({ code: 0, data: lines });
});

module.exports = router;
