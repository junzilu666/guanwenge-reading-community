/**
 * routes/articles.js —— 文章浏览：信息流 / 列表 / 分类 / 详情 / 点赞
 */
const express = require('express');
const store = require('../lib/store');
const auth = require('../lib/auth');
const growth = require('../lib/growth');
const art = require('../lib/articles');

const router = express.Router();

const PUBLISHED = 'published';

/** 组装列表对象（含作者昵称 + 认证） */
function enrich(article, currentUser) {
  const view = art.toArticleView(article, currentUser);
  // 若是注册用户投稿，附带其认证信息
  if (article.isUser && article.username) {
    const profile = store.readUserJson(article.username, 'profile.json', { verify: { blue: false, yellow: false } });
    view.authorVerify = (profile.verify && profile.verify.blue) ? 'blue' : ((profile.verify && profile.verify.yellow) ? 'yellow' : '');
  }
  return view;
}

/** 首页信息流：上下滑动，置顶 + 双V + 热度加权排序 */
router.get('/feed', (req, res) => {
  const index = art.getIndex();
  const cfg = growth.getConfig();
  const list = index.articles
    .filter((a) => a.status === PUBLISHED)
    .map((a) => ({ a, score: art.feedScore(a, cfg) }))
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(20, Math.max(1, parseInt(req.query.size, 10) || 5));
  const start = (page - 1) * size;
  const data = list.slice(start, start + size).map((a) => enrich(a, req.query.user || ''));
  res.json({ code: 0, data: { list: data, page, size, total: list.length, hasMore: start + size < list.length } });
});

/** 分类列表（按文章出现频次统计） */
router.get('/categories', (req, res) => {
  const index = art.getIndex();
  const counts = {};
  index.articles
    .filter((a) => a.status === PUBLISHED)
    .forEach((a) => {
      const c = a.category || '未分类';
      counts[c] = (counts[c] || 0) + 1;
    });
  const data = Object.keys(counts).map((name) => ({ name, count: counts[name] }));
  data.sort((a, b) => b.count - a.count);
  res.json({ code: 0, data });
});

/** 文章列表：分页 + 分类 + 搜索 + 排序(recommend/latest/hot) */
router.get('/', (req, res) => {
  const index = art.getIndex();
  const { category, keyword, sort } = req.query;
  let list = index.articles.filter((a) => a.status === PUBLISHED);

  if (category && category !== '全部') list = list.filter((a) => (a.category || '未分类') === category);
  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    list = list.filter((a) =>
      [a.title, a.summary, a.author, a.category].join(' ').toLowerCase().includes(kw)
    );
  }
  const cfg = growth.getConfig();
  if (sort === 'hot') {
    list.sort((a, b) => ((b.views || 0) + (b.likes || 0) * 5) - ((a.views || 0) + (a.likes || 0) * 5));
  } else if (sort === 'latest') {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    list.sort((a, b) => art.feedScore(b, cfg) - art.feedScore(a, cfg));
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(50, Math.max(1, parseInt(req.query.size, 10) || 10));
  const start = (page - 1) * size;
  const data = list.slice(start, start + size).map((a) => enrich(a, req.query.user || ''));
  res.json({ code: 0, data: { list: data, page, size, total: list.length, hasMore: start + size < list.length } });
});

/** 文章详情：阅读数自增、记录浏览历史、发放阅读经验金币 */
router.get('/:id', (req, res) => {
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === req.params.id);
  if (!article) return res.json({ code: 1, msg: '文章不存在或已被删除' });

  // 未发布/已下架/被驳回 的文章不允许普通访问
  if (article.status !== PUBLISHED) {
    return res.json({ code: 1, msg: '文章未发布或已下架' });
  }

  article.views = (article.views || 0) + 1;
  art.saveIndex(index);

  const currentUser = req.query.user || '';
  const view = enrich(article, currentUser);
  view.content = art.readContent(article);

  // 登录用户：记录阅读历史 + 发放阅读奖励
  if (currentUser) {
    const history = store.readUserJson(currentUser, 'history.json', []);
    const entry = { articleId: article.id, title: article.title, time: store.nowStr() };
    const filtered = Array.isArray(history) ? history.filter((h) => h.articleId !== article.id) : [];
    filtered.unshift(entry);
    store.writeUserJson(currentUser, 'history.json', filtered.slice(0, 50));
    growth.applyRead(currentUser);
  }

  res.json({ code: 0, data: view });
});

/** 点赞 / 取消点赞（防重复点赞：重复点击即为取消） */
router.post('/:id/like', auth.requireUser, (req, res) => {
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === req.params.id);
  if (!article) return res.json({ code: 1, msg: '文章不存在' });

  const likes = art.getLikes();
  if (!Array.isArray(likes[article.id])) likes[article.id] = [];
  const i = likes[article.id].indexOf(req.user.username);
  let liked;
  if (i >= 0) {
    likes[article.id].splice(i, 1); // 取消点赞
    liked = false;
  } else {
    likes[article.id].push(req.user.username); // 点赞
    liked = true;
  }
  art.saveLikes(likes);
  const count = likes[article.id].length;
  store.log('info', `文章 ${article.id} 点赞${liked ? '赞' : '取消'}，用户 ${req.user.username}`);
  res.json({ code: 0, data: { liked, likes: count } });
});

module.exports = router;
