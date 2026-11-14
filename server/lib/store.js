/**
 * store.js —— 观文阁后端 本地文件存储工具库
 * 负责所有 JSON / MD 文件的读写、目录创建、日志输出与容错兜底。
 */
const fs = require('fs');
const path = require('path');

// ---------- 全局路径常量 ----------
const ROOT = __dirname.replace(/\\lib$/, ''); // server 根目录
const DATA_DIR = path.join(ROOT, 'data');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const USERS_DIR = path.join(ROOT, 'users');
const SYSTEM_DIR = path.join(ROOT, 'system');
const LOG_DIR = path.join(SYSTEM_DIR, 'log');
const IMPORTS_DIR = path.join(ROOT, 'imports');

// ---------- 常用数据文件 ----------
const FILES = {
  baseUser: path.join(DATA_DIR, 'base_user.json'),
  config: path.join(DATA_DIR, 'config.json'),
  articlesIndex: path.join(DATA_DIR, 'articles_index.json'),
  likes: path.join(DATA_DIR, 'likes.json'),
  comments: path.join(DATA_DIR, 'comments.json'),
  applications: path.join(DATA_DIR, 'verify_applications.json'),
  reward: path.join(SYSTEM_DIR, 'reward.json'), // 打赏记录（后台手动录入）
  log: path.join(LOG_DIR, 'app.log'),
};

/** 确保目录存在（不存在则递归创建） */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 读取 JSON 文件；文件缺失或解析失败时返回兜底值，保证接口不崩溃 */
function readJson(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    log('warn', `读取 JSON 失败，已使用默认值: ${file} (${e.message})`);
    return fallback;
  }
}

/** 写入 JSON 文件（自动建目录、格式化缩进、原子写入防损坏） */
function writeJson(file, data) {
  try {
    ensureDir(path.dirname(file));
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return true;
  } catch (e) {
    log('error', `写入 JSON 失败: ${file} (${e.message})`);
    return false;
  }
}

/** 读取文本文件（如 .md）；缺失返回空串 */
function readText(file) {
  try {
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf-8');
  } catch (e) {
    log('warn', `读取文本失败: ${file} (${e.message})`);
    return '';
  }
}

/** 写入文本文件 */
function writeText(file, content) {
  try {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, content, 'utf-8');
    return true;
  } catch (e) {
    log('error', `写入文本失败: ${file} (${e.message})`);
    return false;
  }
}

/** 追加一行文本（用于日志） */
function appendText(file, line) {
  try {
    ensureDir(path.dirname(file));
    fs.appendFileSync(file, line + '\n', 'utf-8');
    return true;
  } catch (e) {
    return false;
  }
}

/** 删除文件，不存在则忽略 */
function removeFile(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

/** 列出目录下全部文件名 */
function listDir(dir, ext) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => !ext || f.endsWith(ext));
  } catch (e) {
    return [];
  }
}

/**
 * 递归删除目录（含子目录与文件）。
 * 说明：Windows 下对含中文路径的目录，fs.rmSync(dir,{recursive}) 可能静默失效，
 * 因此改用逐项删除 + rmdir 的稳妥实现。
 */
function removeDirRecursive(dir) {
  if (!fs.existsSync(dir)) return true;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) removeDirRecursive(full);
      else fs.unlinkSync(full);
    });
    fs.rmdirSync(dir);
    return true;
  } catch (e) {
    log('error', `删除目录失败: ${dir} (${e.message})`);
    return false;
  }
}

/** 生成时间戳字符串 YYYY-MM-DD HH:mm:ss */
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 生成日期字符串 YYYY-MM-DD */
function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 生成短 ID：时间戳 + 随机数 */
function genId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 写入系统日志 system/log/app.log */
function log(level, msg) {
  appendText(FILES.log, `[${nowStr()}] [${level.toUpperCase()}] ${msg}`);
}

// ---------- 用户目录相关 ----------

/** 用户目录路径 */
function userDir(username) {
  return path.join(USERS_DIR, String(username).replace(/[\\/:*?"<>|]/g, '_'));
}

/** 用户目录内文件路径 */
function userFile(username, filename) {
  return path.join(userDir(username), filename);
}

/** 创建用户独立文件夹（注册成功后调用），返回是否成功 */
function createUserFolder(username) {
  try {
    const dir = userDir(username);
    ensureDir(path.join(dir, 'articles'));
    writeJson(path.join(dir, 'profile.json'), {
      nickname: username,
      avatar: '',
      bio: '这个人很懒，还没有写简介~',
      verify: { blue: false, yellow: false, pending: false },
    });
    writeJson(path.join(dir, 'growth.json'), {
      exp: 0,
      coins: 10, // 新用户赠送 10 金币
      checkinDates: [],
      readCount: 0,
      commentCount: 0,
      publishCount: 0,
    });
    writeJson(path.join(dir, 'favorites.json'), []);
    writeJson(path.join(dir, 'history.json'), []);
    writeJson(path.join(dir, 'comments.json'), []);
    return true;
  } catch (e) {
    log('error', `创建用户文件夹失败: ${username} (${e.message})`);
    return false;
  }
}

/** 读取用户目录 JSON（缺文件自动用默认值并重建） */
function readUserJson(username, filename, fallback) {
  const file = userFile(username, filename);
  let data = readJson(file, fallback);
  if (!fs.existsSync(file)) {
    writeJson(file, data);
  }
  return data;
}

/** 写入用户目录 JSON */
function writeUserJson(username, filename, data) {
  return writeJson(userFile(username, filename), data);
}

module.exports = {
  ROOT,
  DATA_DIR,
  ARTICLES_DIR,
  USERS_DIR,
  SYSTEM_DIR,
  LOG_DIR,
  IMPORTS_DIR,
  FILES,
  ensureDir,
  readJson,
  writeJson,
  readText,
  writeText,
  appendText,
  removeFile,
  listDir,
  removeDirRecursive,
  nowStr,
  todayStr,
  genId,
  log,
  userDir,
  userFile,
  createUserFolder,
  readUserJson,
  writeUserJson,
};
