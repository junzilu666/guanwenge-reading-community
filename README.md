# 📖 观文阁 GuanWenGe

> 简约国风文章阅读社区 · 仿人民日报资讯模式 · 抖音式上下滑动图文信息流阅读
> A minimalist Chinese-style article reading community — swiping feed like Douyin, information layout like People's Daily.

观文阁是一个**本地部署、零数据库**的全栈文章阅读社区。采用米白 `#F8F6F0` 极简国风视觉，提供普通用户阅读端、独立后台管理系统与 Node.js 文件存储服务三端，一键启动即可使用。

GuanWenGe is a **self-hosted, zero-database** full-stack article reading community with a minimalist rice-white `#F8F6F0` Chinese aesthetic. It ships with three parts: the reader web app, a separate admin dashboard, and a Node.js file-storage backend. One-click scripts get everything running.

- 中文说明见下方「功能特性」起；English documentation below at **Features**.

---

## ✨ 功能特性

### 📱 用户端（localhost:5173）
- **抖音式上下滑动信息流**：整屏沉浸浏览，每次进入随机排序
- 登录 / 注册：注册自动生成专属用户文件夹
- 文章分类、关键词搜索、MD 文章渲染、移动端适配
- 点赞、评论（分页）、收藏、阅读历史
- 深浅色模式一键切换
- **创作者双 V 认证**：蓝 V（官方/机构，后台授予）、黄 V（个人创作者，申请审核）
- **成长与经济系统**：经验升级、每日打卡、阅读/评论/投稿赚金币；金币用于置顶、黄 V 加速、推荐位
- **请作者喝咖啡**：我的页面展示微信收款二维码（自愿打赏，见下方「打赏二维码」）

### 🛠️ 后台管理（localhost:5174）
- **数据监测**：用户/文章/阅读/点赞/评论统计、近 7 天活跃度、分类分布、热门 TOP10
- **内容管理**：上传 MD 文章、批量导入、上架/下架/置顶/编辑/删除；作者支持带搜索的用户下拉选取（自动继承昵称与 V 认证）
- **用户管理**：查看用户文件夹全部数据、封禁/解封、授予/撤销蓝 V 黄 V、调整金币、添加/删除用户（连带清理关联数据）
- **内容审核**：投稿审核、黄 V 申请审核、违规评论删除
- **打赏统计**：手动录入打赏记录（存于 `/system/reward.json`）
- **系统配置**：自定义经验/金币规则、首页推荐算法参数
- **系统日志**：实时查看后端操作日志

### ⚙️ 后端服务（localhost:3000）
- Node.js + Express，纯本地 JSON/MD 文件存储，**无数据库依赖**
- 统一 `{code, msg, data}` 接口规范，异常自动兜底

---

## ✨ Features (English)

### 📱 Reader App (localhost:5173)
- **Douyin-style vertical feed**: full-screen immersive browsing with random shuffle on each visit
- Sign up / sign in — a dedicated data folder is created per user
- Category browsing, keyword search, Markdown article rendering, mobile-friendly
- Likes, paginated comments, favorites, reading history
- One-click dark / light mode
- **Dual creator verification**: Blue V (official/organization, granted by admin), Yellow V (individual creator, application + review)
- **Growth & economy system**: XP levels, daily check-in, earn coins from reading/commenting/publishing; coins can be spent on pinning, Yellow V fast-track and recommendation slots
- **Buy the author a coffee**: show a personal WeChat reward QR code on the profile page (see "Reward QR code")

### 🛠️ Admin Dashboard (localhost:5174)
- **Analytics**: user/article/read/like/comment stats, 7-day activity chart, category distribution, top-10 articles
- **Content management**: upload Markdown articles, bulk import, publish/unpublish/pin/edit/delete; article author can be picked from a searchable user dropdown (nickname & V badge inherited)
- **User management**: inspect each user's data folder, ban/unban, grant/revoke Blue V & Yellow V, adjust coins, add/delete users (related data cleaned up too)
- **Moderation**: review user-submitted drafts, review Yellow V applications, delete violating comments
- **Reward records**: manually record tips (stored in `/system/reward.json`)
- **System settings**: customize XP/coin rules and home-feed recommendation parameters
- **Logs**: view backend operation logs in real time

### ⚙️ Backend (localhost:3000)
- Node.js + Express, plain local JSON/Markdown file storage, **no database required**
- Unified `{code, msg, data}` API response format with automatic error fallback

---

## 🧱 技术栈 Tech Stack

| 端 Part | 技术 Tech |
|---|---|
| 后端 Backend | Node.js + Express 4 |
| 用户前端 Reader | Vue 3 + Vite 5 + vue-router + marked + DOMPurify |
| 后台管理 Admin | Vue 3 + Vite 5 + vue-router |
| 存储 Storage | 本地 JSON / Markdown 文件 Local JSON / Markdown files (`server/data`、`server/articles`、`server/users`、`server/system`) |

**运行环境 Requirements**: Windows 10/11 · Linux · Node.js ≥ 18 · npm ≥ 9

---

## 📂 项目结构 Project Structure

```
观文阁/
├── README.md                       # 中英双语说明 Bilingual guide
├── server/                 # 后端服务 Backend (localhost:3000)
│   ├── server.js           # Express 入口 Entry
│   ├── lib/                # 存储/认证/成长系统 Storage, auth, growth system
│   ├── routes/             # auth / articles / comments / user / admin
│   ├── data/               # 账号、索引、点赞、评论等 JSON
│   ├── articles/           # 公共文章 Public articles (.md)
│   ├── users/              # 每位用户独立文件夹 Per-user data folders
│   ├── imports/            # 批量导入目录 Bulk import drop folder
│   └── system/             # reward.json / log
├── web/                    # 用户前端 Reader (localhost:5173)
│   └── src/views/          # 信息流/我的/文章详情/登录等 views
├── admin/                  # 后台管理 Admin dashboard (localhost:5174)
│   └── src/views/          # 数据监测/内容/用户/审核等 views
└── scripts/                # 一键启动脚本 One-click scripts
    ├── *.bat               # Windows 版（UTF-8）
    └── linux/              # Linux 版 shell 脚本 + 使用说明
```

---

## 🚀 快速开始 Quick Start

### 方式一：双击脚本（Windows 小白推荐）Option 1: One-click scripts (Windows)

按顺序双击 `scripts/` 下的脚本 / Double-click the scripts under `scripts/` in order:

| 步骤 Step | 脚本 Script | 说明 Description |
|---|---|---|
| 1 | `00-环境检测.bat` | 检测 Node.js / npm Check environment |
| 2 | `01-安装依赖.bat` | 一键安装三端依赖（仅首次）Install dependencies (first time only) |
| 3 | `02-启动后端.bat` | 启动后端（3000，监听 127.0.0.1）Start backend |
| 4 | `03-启动后台管理.bat` | 启动后台（5174）Start admin dashboard |
| 5 | `04-启动用户前端.bat` | 启动用户端（5173）Start reader app |

> 也可以直接双击 `05-一键启动全部.bat`，自动按「后端 → 后台 → 前端」顺序启动三个服务。
> Or just run `05-一键启动全部.bat` to launch all three services in order automatically.

### 方式二：命令行 Option 2: Command line

```bash
# 安装依赖（三个工程各一次）Install dependencies (once per project)
cd server && npm install
cd ../admin && npm install
cd ../web && npm install

# 启动（按固定顺序，建议分窗口执行）Start in this order, one window each
cd server && node server.js      # 后端 Backend 3000
cd ../admin && npm run dev       # 后台 Admin 5174
cd ../web && npm run dev         # 用户端 Reader 5173
```

### 方式三：部署到 Linux Option 3: Linux

把整个文件夹传到 Linux 后 / Copy the whole folder to Linux, then:

```bash
cd 观文阁/scripts/linux
bash 00-环境检测.sh && bash 01-安装依赖.sh && bash 05-一键启动全部.sh
```

详见 `scripts/linux/README-Linux使用说明.md`。

### 访问入口 Access

| 服务 Service | 地址 URL | 默认账号 Default account |
|---|---|---|
| 用户前端 Reader | http://localhost:5173 | demo / 123456 |
| 后台管理 Admin | http://localhost:5174 | admin / admin |
| 后端接口 API | http://localhost:3000/api | — |

> 三端默认仅监听 `127.0.0.1`（本机访问）。如需局域网/公网访问，把 `server/.env` 的 `HOST` 和两端 `vite.config.js` 的 `host` 改为 `0.0.0.0`，并自行做好防火墙与反向代理（如 Nginx）配置。
> All three services listen on `127.0.0.1` by default. To expose them to LAN/public, change `HOST` in `server/.env` and `host` in both `vite.config.js` files to `0.0.0.0`, and configure your firewall / reverse proxy (e.g. Nginx) accordingly.

---

## 🗄️ 数据说明 Data (file storage)

| 数据 Data | 位置 Location | 说明 Notes |
|---|---|---|
| 账号 Accounts | `server/data/base_user.json` | 注册用户账号密码 |
| 文章 Articles | `server/articles/*.md` + `server/data/articles_index.json` | 正文与索引 Body & index |
| 用户数据 User data | `server/users/<用户名>/` | 资料、成长、收藏、历史、评论、文稿 |
| 互动数据 Interactions | `server/data/likes.json`、`comments.json` | 点赞与评论 Likes & comments |
| 打赏记录 Rewards | `server/system/reward.json` | 后台手动录入 |
| 系统日志 Logs | `server/system/log/app.log` | 全量操作日志 |

备份 = 直接复制上述目录/文件即可。Backup = just copy the folders/files above.

---

## 🧩 使用技巧 Tips

- **发布文章 Publish**：后台「内容管理」→ 上传文章（作者可从用户下拉中选取，自动带 V 认证）
- **批量导入 Bulk import**：把 `.md` 文件丢进 `server/imports/`，后台一键导入自动发布
- **授予认证 Verification**：后台「用户管理」授予/撤销蓝 V；黄 V 由用户申请、后台审核
- **调整规则 Rules**：后台「系统配置」修改经验/金币/推荐算法参数，即时生效
- **删除用户 Delete user**：后台「用户管理」→ 删除（需输入用户名确认，关联数据一并清理）

### 💰 打赏二维码 Reward QR code

「请作者喝咖啡」功能会展示 `web/public/wechat_reward.png`。出于隐私考虑，本仓库**不包含**个人收款码；把自己的微信收款/赞赏码重命名为 `wechat_reward.png` 放入 `web/public/` 即可启用，缺失时页面自动显示占位提示。

The "Buy the author a coffee" card displays `web/public/wechat_reward.png`. For privacy, this repository does **not** include a personal payment QR code. To enable it, put your own WeChat QR code (renamed to `wechat_reward.png`) into `web/public/`. When the file is missing, a placeholder is shown automatically.

---

## ❓ 常见问题 FAQ

- **页面打不开 Page won't load**：确认三个服务窗口都在运行；端口被占用时用 `netstat -ano | findstr ":5173"` 找到 PID，`taskkill /PID <pid> /F` 释放后重启。Check that all three services are running; if a port is occupied, kill the process and restart.
- **接口全部失败 API calls fail**：后端窗口未启动或已退出，重跑 `02-启动后端.bat`。The backend is not running — restart it.
- **改了代码没生效 Changes not applied**：前端保存后 Vite 自动热更新；改后端必须重启后端进程。Frontend hot-reloads; backend changes need a restart.
- **如何备份 How to back up**：直接复制 `server/data`、`server/articles`、`server/users`、`server/system` 即可。Just copy the data folders.

---

## 📄 License

本项目为本地学习 / 演示项目，数据与接口无外部依赖，可自由用于学习与二次开发。
This is a local learning / demo project with no external dependencies. Free to use for learning and further development.
