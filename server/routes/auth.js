/**
 * routes/auth.js —— 注册 / 登录 / 当前用户 / 退出
 */
const express = require('express');
const store = require('../lib/store');
const auth = require('../lib/auth');
const growth = require('../lib/growth');

const router = express.Router();

/** 用户名合法性：3-16 位字母数字或中文/下划线 */
function validName(name) {
  return /^[\u4e00-\u9fa5A-Za-z0-9_]{2,16}$/.test(name || '');
}

/** 注册：自动创建 /users/用户名/ 独立文件夹 */
router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body || {};
  if (!validName(username)) return res.json({ code: 1, msg: '用户名需为2-16位中文/字母/数字/下划线' });
  if (!password || String(password).length < 4) return res.json({ code: 1, msg: '密码至少4位' });

  const base = store.readJson(store.FILES.baseUser, { users: [] });
  if (base.users.some((u) => u.username === username)) {
    return res.json({ code: 1, msg: '该用户名已被注册' }); // 重复注册容错
  }

  const user = {
    username,
    password: String(password),
    nickname: (nickname && nickname.trim()) || username,
    createdAt: store.nowStr(),
    status: 'active',
  };
  base.users.push(user);
  if (!store.writeJson(store.FILES.baseUser, base)) {
    return res.json({ code: 1, msg: '注册失败，请重试' });
  }
  // 自动生成用户专属文件夹
  store.createUserFolder(username);

  const token = auth.createSession('user', username);
  store.log('info', `新用户注册: ${username}`);
  res.json({ code: 0, data: { token, user: growth.getUserProfile(username) } });
});

/** 登录：从 base_user.json 校验密码 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const base = store.readJson(store.FILES.baseUser, { users: [] });
  const user = base.users.find((u) => u.username === username);
  if (!user) return res.json({ code: 1, msg: '用户名不存在' });
  if (user.password !== String(password)) return res.json({ code: 1, msg: '密码错误' });
  if (user.status === 'banned') return res.json({ code: 1, msg: '账号已被封禁，请联系管理员' });

  const token = auth.createSession('user', username);
  store.log('info', `用户登录: ${username}`);
  res.json({ code: 0, data: { token, user: growth.getUserProfile(username) } });
});

/** 当前用户信息 */
router.get('/me', auth.requireUser, (req, res) => {
  res.json({ code: 0, data: growth.getUserProfile(req.user.username) });
});

/** 退出登录 */
router.post('/logout', (req, res) => {
  if (req.headers.authorization) {
    auth.destroySession(String(req.headers.authorization).replace(/^Bearer\s+/i, ''));
  }
  res.json({ code: 0, data: true });
});

module.exports = router;
