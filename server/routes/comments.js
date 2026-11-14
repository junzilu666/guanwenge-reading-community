/**
 * routes/comments.js —— 文章评论：查询分页 / 发表评论
 */
const express = require('express');
const store = require('../lib/store');
const auth = require('../lib/auth');
const growth = require('../lib/growth');
const art = require('../lib/articles');

const router = express.Router();

/** 评论分页查询 */
router.get('/:id/comments', (req, res) => {
  const all = art.getComments();
  const arr = (all[req.params.id] || []).filter((c) => c.status !== 'removed');
  arr.sort((a, b) => new Date(b.time) - new Date(a.time));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(30, Math.max(1, parseInt(req.query.size, 10) || 10));
  const start = (page - 1) * size;
  res.json({
    code: 0,
    data: { list: arr.slice(start, start + size), page, size, total: arr.length, hasMore: start + size < arr.length },
  });
});

/** 发表评论（空评论拦截；评论记录同时写入用户文件夹） */
router.post('/:id/comments', auth.requireUser, (req, res) => {
  const index = art.getIndex();
  const article = index.articles.find((a) => a.id === req.params.id);
  if (!article) return res.json({ code: 1, msg: '文章不存在' });
  if (article.status !== 'published') return res.json({ code: 1, msg: '文章未发布，无法评论' });

  const content = String((req.body || {}).content || '').trim();
  if (!content) return res.json({ code: 1, msg: '评论内容不能为空' }); // 空评论容错
  if (content.length > 500) return res.json({ code: 1, msg: '评论最长500字' });

  const all = art.getComments();
  if (!Array.isArray(all[article.id])) all[article.id] = [];
  const comment = {
    id: store.genId('c'),
    articleId: article.id,
    articleTitle: article.title,
    user: req.user.username,
    nickname: req.user.nickname || req.user.username,
    content,
    time: store.nowStr(),
    status: 'active',
  };
  all[article.id].push(comment);
  art.saveComments(all);

  // 写入用户文件夹 comments.json
  const mine = store.readUserJson(req.user.username, 'comments.json', []);
  mine.unshift({ articleId: article.id, articleTitle: article.title, content, time: comment.time });
  store.writeUserJson(req.user.username, 'comments.json', mine.slice(0, 100));

  // 发放评论经验金币
  growth.applyComment(req.user.username);
  store.log('info', `用户 ${req.user.username} 评论文章 ${article.id}`);
  res.json({ code: 0, data: comment });
});

module.exports = router;
