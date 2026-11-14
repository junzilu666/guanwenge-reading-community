/**
 * articles.js —— 文章公共操作（索引读写 / 推荐打分 / 摘要生成 / 统计）
 */
const path = require('path');
const store = require('./store');

/** 读取文章索引 */
function getIndex() {
  return store.readJson(store.FILES.articlesIndex, { articles: [] });
}

/** 保存文章索引 */
function saveIndex(index) {
  return store.writeJson(store.FILES.articlesIndex, index);
}

/** 文章 .md 文件路径 */
function articleFile(id) {
  return path.join(store.ARTICLES_DIR, `${id}.md`);
}

/** 从 MD 正文抽取摘要（去掉标记符号，截取前 100 字） */
function makeSummary(content, custom) {
  if (custom && custom.trim()) return custom.trim().slice(0, 120);
  const plain = (content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/[#>*`\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 100) + (plain.length > 100 ? '…' : '');
}

/** 读取点赞表 */
function getLikes() {
  return store.readJson(store.FILES.likes, {});
}

/** 保存点赞表 */
function saveLikes(likes) {
  return store.writeJson(store.FILES.likes, likes);
}

/** 读取评论表 */
function getComments() {
  return store.readJson(store.FILES.comments, {});
}

/** 保存评论表 */
function saveComments(cs) {
  return store.writeJson(store.FILES.comments, cs);
}

/** 统计某文章点赞数 */
function likeCount(id) {
  const likes = getLikes();
  return Array.isArray(likes[id]) ? likes[id].length : 0;
}

/** 统计某文章评论数 */
function commentCount(id) {
  const cs = getComments();
  const arr = cs[id] || [];
  return Array.isArray(arr) ? arr.filter((c) => c.status !== 'removed').length : 0;
}

/** 计算文章推荐分（首页信息流排序依据） */
function feedScore(article, cfg) {
  const rc = cfg.recommend;
  let score = 0;
  if (article.pinned) score += rc.pinnedWeight || 100;
  if (article.authorVerify === 'blue') score += rc.blueVWeight || 10;
  if (article.authorVerify === 'yellow') score += rc.yellowVWeight || 3;
  score += (article.likes || 0) * (rc.likesWeight || 2);
  score += (article.views || 0) * (rc.viewsWeight || 0.5);
  // 新文章加成（7 天内的文章额外加分）
  const age = (Date.now() - new Date(article.createdAt).getTime()) / (24 * 3600 * 1000);
  if (age < 7) score += (rc.newWeight || 5) * (1 - age / 7);
  return Math.round(score * 100) / 100;
}

/** 组装文章对外对象（列表/详情通用） */
function toArticleView(article, currentUser) {
  const likes = getLikes();
  const likers = Array.isArray(likes[article.id]) ? likes[article.id] : [];
  const cs = getComments();
  const cmts = Array.isArray(cs[article.id]) ? cs[article.id] : [];
  return {
    id: article.id,
    title: article.title,
    category: article.category || '未分类',
    author: article.author,
    authorVerify: article.authorVerify || '',
    createdAt: article.createdAt,
    status: article.status,
    pinned: !!article.pinned,
    recommended: !!article.recommended,
    cover: article.cover || '',
    summary: article.summary || '',
    views: article.views || 0,
    likes: likers.length,
    liked: currentUser ? likers.includes(currentUser) : false,
    commentsCount: cmts.filter((c) => c.status !== 'removed').length,
    isUser: !!article.isUser,
    username: article.username || '',
  };
}

/** 新建一篇文章（写入 md + 索引），返回新文章对象或 null */
function createArticle({ title, category, author, authorVerify, content, cover, summary, status = 'published', isUser = false, username = '', pinned = false, recommended = false }) {
  if (!title || !title.trim() || !content || !content.trim()) return null;
  const index = getIndex();
  const id = store.genId('a');
  const now = store.nowStr();
  const article = {
    id,
    title: title.trim(),
    category: (category || '未分类').trim(),
    author: author || '观文阁编辑部',
    authorVerify: authorVerify || '',
    createdAt: now,
    updatedAt: now,
    status,
    pinned,
    recommended,
    cover: cover || '',
    summary: makeSummary(content, summary),
    views: 0,
    likes: 0,
    isUser,
    username,
    filename: `${id}.md`,
  };
  index.articles.push(article);
  if (store.writeText(articleFile(id), content)) {
    saveIndex(index);
    store.log('info', `新增文章: ${title} (${id}, 状态:${status})`);
    return article;
  }
  return null;
}

/** 读取文章正文 */
function readContent(article) {
  return store.readText(articleFile(article.id));
}

module.exports = {
  getIndex,
  saveIndex,
  articleFile,
  makeSummary,
  getLikes,
  saveLikes,
  getComments,
  saveComments,
  likeCount,
  commentCount,
  feedScore,
  toArticleView,
  createArticle,
  readContent,
};
