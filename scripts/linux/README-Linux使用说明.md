# Linux 端使用说明

这组 `.sh` 脚本是 Windows `.bat` 脚本的 Linux 等价版本，把整个项目文件夹拷到 Linux 服务器/电脑后使用。

## 第一步：上传项目

把整个 `观文阁` 文件夹传到 Linux（scp / WinSCP / git 均可），例如放到 `~/guanwenge`：

```bash
scp -r "观文阁" 用户名@服务器IP:~/guanwenge
```

> 不需要传 `node_modules`（太大，Linux 上用 01 脚本重新装）。

## 第二步：按顺序执行

```bash
cd ~/guanwenge/scripts/linux

bash 00-环境检测.sh      # 检查 Node.js（没有会给出安装命令）
bash 01-安装依赖.sh      # 安装三端依赖（仅首次）
bash 05-一键启动全部.sh   # 后台方式启动三端，日志在 scripts/linux/logs/
```

启动后网址（Linux 本机浏览器或 curl 验证）：

| 服务 | 网址 | 账号 |
|---|---|---|
| 前端（看文章、注册登录） | http://127.0.0.1:5173 | demo / 123456 |
| 后端（接口） | http://127.0.0.1:3000 | — |
| 管理（管理员后台） | http://127.0.0.1:5174 | admin / admin |

## 常用命令

| 脚本 | 作用 |
|---|---|
| `bash 02-启动后端.sh` | 单独前台启动后端（Ctrl+C 停止） |
| `bash 03-启动后台管理.sh` | 单独前台启动后台管理 |
| `bash 04-启动用户前端.sh` | 单独前台启动用户前端 |
| `bash 07-停止全部.sh` | 停止三端服务 |

## 注意事项

- 三端均只监听 `127.0.0.1`：Linux 本机可以直接访问，**局域网/其他设备默认访问不到**。如需局域网/公网直连，把 `server/.env` 的 `HOST` 和两端 `vite.config.js` 的 `host` 改为 `0.0.0.0`，并自行做好防火墙与反向代理（如 Nginx）配置。
- 如果 `bash xxx.sh` 报 `\r` 相关错误，说明行尾被改成了 Windows 格式，执行一次：`sed -i 's/\r$' 脚本名.sh` 即可（本组脚本已统一为 LF）。
