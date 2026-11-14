/**
 * auth.js —— 登录会话管理（内存 Session + 简单 Token）
 * 普通用户 token 与管理员 token 分离校验。
 */
const crypto = require('crypto');
const store = require('./store');

const SECRET = 'guanwenge-local-secret-2024';
/** 内存会话表: token -> { type: 'user'|'admin', username } */
const sessions = new Map();

/** 生成带签名的 token */
function sign(username, type) {
  const ts = Date.now();
  const raw = `${type}|${username}|${ts}`;
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex').slice(0, 16);
  return Buffer.from(`${raw}|${sig}`).toString('base64');
}

/** 解析并校验 token，返回 { type, username } 或 null */
function verify(token) {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parts = raw.split('|');
    if (parts.length !== 4) return null;
    const [type, username, ts, sig] = parts;
    const check = crypto.createHmac('sha256', SECRET).update(`${type}|${username}|${ts}`).digest('hex').slice(0, 16);
    if (check !== sig) return null;
    // 会话有效期 7 天
    if (Date.now() - Number(ts) > 7 * 24 * 3600 * 1000) return null;
    return { type, username };
  } catch (e) {
    return null;
  }
}

/** 创建会话并返回 token */
function createSession(type, username) {
  const token = sign(username, type);
  sessions.set(token, { type, username });
  return token;
}

/** 销毁会话 */
function destroySession(token) {
  sessions.delete(token);
}

/** Express 中间件：校验普通用户登录 */
function requireUser(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const info = token && verify(token);
  if (!info || info.type !== 'user') {
    return res.json({ code: 1, msg: '请先登录' });
  }
  // 校验用户存在且未被封禁
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const user = base.users.find((u) => u.username === info.username);
  if (!user) return res.json({ code: 1, msg: '用户不存在，请重新登录' });
  if (user.status === 'banned') return res.json({ code: 1, msg: '账号已被封禁，无法操作' });
  req.user = user;
  req.token = token;
  next();
}

/** Express 中间件：校验管理员登录 */
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const info = token && verify(token);
  if (!info || info.type !== 'admin') {
    return res.json({ code: 1, msg: '未登录或登录已过期' });
  }
  req.admin = { username: info.username };
  req.token = token;
  next();
}

module.exports = { createSession, destroySession, requireUser, requireAdmin };
