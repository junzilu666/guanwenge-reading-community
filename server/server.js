/**
 * server.js —— 观文阁后端主服务（localhost:3000）
 * 启动流程：初始化目录 → 挂载中间件 → 挂载路由 → 监听端口。
 */
const express = require('express');
const store = require('./lib/store');
const routesAuth = require('./routes/auth');
const routesArticles = require('./routes/articles');
const routesComments = require('./routes/comments');
const routesUser = require('./routes/user');
const routesAdmin = require('./routes/admin');

// ---------- 读取 server/.env 配置文件（开发者可随时修改，无需动代码） ----------
function loadEnvFile(file) {
  const path = require('path');
  const fs = require('fs');
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) return {};
  const env = {};
  fs.readFileSync(full, 'utf-8').split('\n').forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return env;
}
const env = loadEnvFile('.env');

// 进程环境变量优先于 .env 文件（便于测试时用 PORT=3001 临时起第二个实例）
const PORT = Number(process.env.PORT) || Number(env.PORT) || 3000;
const HOST = process.env.HOST || env.HOST || '0.0.0.0'; // 默认允许外网访问
const PUBLIC_URL = env.API_PUBLIC_URL || 'http://localhost:3000'; // 对外展示地址

// ---------- 1. 初始化基础目录 ----------
store.ensureDir(store.DATA_DIR);
store.ensureDir(store.ARTICLES_DIR);
store.ensureDir(store.USERS_DIR);
store.ensureDir(store.LOG_DIR);
store.ensureDir(store.IMPORTS_DIR);

// 关键数据文件缺失时自动补默认值（容错：文件缺失兜底）
const fs = require('fs');
if (!fs.existsSync(store.FILES.baseUser)) store.writeJson(store.FILES.baseUser, { users: [] });
if (!fs.existsSync(store.FILES.articlesIndex)) store.writeJson(store.FILES.articlesIndex, { articles: [] });
if (!fs.existsSync(store.FILES.likes)) store.writeJson(store.FILES.likes, {});
if (!fs.existsSync(store.FILES.comments)) store.writeJson(store.FILES.comments, {});
if (!fs.existsSync(store.FILES.applications)) store.writeJson(store.FILES.applications, { list: [] });
if (!fs.existsSync(store.FILES.reward)) store.writeJson(store.FILES.reward, { records: [] }); // 打赏记录

const app = express();

// ---------- 2. 中间件 ----------
app.use(express.json({ limit: '2mb' })); // 支持 MD 文本上传
app.use(express.urlencoded({ extended: true }));

// CORS：允许 5173 / 5174 前后端跨域调用
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 简易请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    store.log('info', `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 0, data: { status: 'ok', time: store.nowStr() } }));

// ---------- 3. 路由挂载 ----------
app.use('/api/auth', routesAuth);
app.use('/api/articles', routesArticles);
app.use('/api/articles', routesComments); // 评论挂在文章下
app.use('/api/user', routesUser);
app.use('/api/admin', routesAdmin);

// 404 兜底
app.use((req, res) => res.json({ code: 1, msg: '接口不存在' }));

// ---------- 4. 启动 ----------
app.listen(PORT, HOST, () => {
  // 获取本机局域网 IP（供内网访问提示）
  const os = require('os');
  let lanIP = 'localhost';
  try {
    const nets = os.networkInterfaces();
    outer: for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) { lanIP = net.address; break outer; }
      }
    }
  } catch (e) { /* 忽略 */ }

  store.log('info', '观文阁后端服务启动成功');

  // ---- 启动横幅（按中文字符宽度对齐） ----
  const padW = (s, w) => s + ' '.repeat(Math.max(0, w - s.length - (s.match(/[\u4e00-\u9fa5]/g) || []).length));
  const W = 52;
  const line = (s) => '  │  ' + padW(s, W) + ' │';
  const bar = '  ┌' + '─'.repeat(W + 4) + '┐';
  console.log('');
  console.log(bar);
  console.log(line('《观文阁》后端服务已启动'));
  console.log(line('外网地址: ' + PUBLIC_URL));
  console.log(line('内网地址: http://' + lanIP + ':' + PORT));
  console.log(line('本机地址: http://localhost:' + PORT));
  console.log(line('健康检查: /api/health'));
  console.log(line('配置修改: server/.env（无需改代码）'));
  console.log('  └' + '─'.repeat(W + 4) + '┘');
  console.log('');
});
