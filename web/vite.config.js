// Vite 配置文件：启用 Vue 插件，开发端口 5173，/api 代理到后端
// 后端地址统一从 .env 读取（VITE_API_PROXY_TARGET），开发者无需改动本文件
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 从 .env 读取配置，未配置时默认本地后端
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [vue()],
    server: {
      // 仅监听本机回环（如需局域网/公网访问改为 '0.0.0.0'）
      host: '127.0.0.1',
      port: 5173,
      // 放行任意 Host 头（本地演示项目，安全风险可控；生产环境建议改为域名列表）
      allowedHosts: true,
      // 开发环境将 /api 请求代理到后端服务
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  }
})
