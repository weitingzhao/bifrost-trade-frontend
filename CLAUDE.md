# CLAUDE.md — bifrost-trade-frontend

与本项目用户的所有对话一律使用中文。

## 职责范围

本 repo 是 Bifrost Trade 系统的 React/TypeScript 前端监控 UI。

## 技术栈

- React 18 + TypeScript
- Vite（构建工具，开发服务器端口 5173）
- CSS（无 Tailwind、无 styled-components）
- 无全局状态库（React hooks + 本地 state）

## 目录结构

```
src/
├── main.tsx            ← 入口，initApiRouting()
├── App.tsx             ← 路由和导航框架
├── pages/              ← ~57 个页面组件
├── api/                ← 按域分组的 HTTP 客户端
│   ├── monitor.ts
│   ├── trading.ts
│   ├── portfolio.ts
│   ├── market.ts       ← SSE 订阅
│   ├── research.ts
│   ├── strategy.ts
│   └── ops.ts
├── hooks/              ← 自定义 hooks（SSE、轮询）
├── components/         ← 可复用 UI 组件
└── utils/              ← 格式化、symbol 规范化、日期
```

## 命令

```bash
npm install
npm run dev      # 开发服务器（端口 5173）
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

## API 连接

开发时：前端 Vite devserver 代理到各 FastAPI 服务（通过 `vite.config.ts` 中的 proxy 配置）。

生产时：构建产物由 Nginx 提供服务，API 请求通过 Nginx 路径路由转发。

## UI 参考

视觉风格参考 Skote Admin 模板（`~/Desktop/framework/Skote_Nodejs_v4.2.0`）：卡片、阴影、表格样式。**只作视觉参考，不复制其代码或依赖。**
