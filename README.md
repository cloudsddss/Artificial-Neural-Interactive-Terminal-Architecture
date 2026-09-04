# ANITA — Artificial Neural Interactive Terminal Architecture

**人工神经交互终端架构** · 科幻交互引擎

一个基于 AI 驱动的沉浸式科幻游戏引擎，后端使用 Express + TypeScript + DeepSeek AI，前端使用 React + Vite + Tailwind CSS，通过流式对话为玩家提供动态叙事体验。

---

## 项目结构

```
anita/
├── .claude/
│   └── settings.local.json     # Claude Code 本地配置
├── anita-backend/              # 后端服务
│   ├── src/
│   │   ├── server.ts           # Express 入口，路由注册与中间件
│   │   ├── routes/
│   │   │   ├── health.ts       # 健康检查接口
│   │   │   ├── chat.ts         # AI 对话接口（流式）
│   │   │   └── userSession.ts  # 玩家会话管理
│   │   ├── tools/
│   │   │   ├── Limiter.ts      # 请求限流中间件
│   │   │   ├── MySql.ts        # MySQL 数据库连接
│   │   │   └── updateSystemState.ts  # 游戏状态更新
│   │   ├── memory/
│   │   │   └── memory.ts       # 记忆系统
│   │   ├── prompts/
│   │   │   └── system.ts       # AI 系统提示词
│   │   └── types/
│   │       └── player.ts       # 玩家类型定义
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── anita-frontend/             # 前端应用
│   ├── public/
│   │   ├── favicon.svg         # 站点图标
│   │   └── icons.svg           # 图标集
│   ├── src/
│   │   ├── App.tsx             # 路由入口（登录 → 游戏）
│   │   ├── main.tsx            # 挂载入口
│   │   ├── index.css           # 全局样式
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx   # 登录/创建角色
│   │   │   └── GamePage.tsx    # 游戏主界面
│   │   ├── components/
│   │   │   ├── Terminal.tsx       # 终端聊天组件
│   │   │   ├── StatusPanel.tsx    # 玩家状态面板
│   │   │   ├── InventoryPanel.tsx # 背包面板
│   │   │   ├── HazardPanel.tsx    # 危险/环境提示面板
│   │   │   ├── LoginScreen.tsx    # 登录表单
│   │   │   └── ScanlineOverlay.tsx# 扫描线 CRT 特效
│   │   ├── hooks/
│   │   │   ├── useStreamingChat.ts # 流式对话 Hook
│   │   │   ├── useAudio.ts         # 音效控制
│   │   │   └── useAutoSave.ts      # 自动存档
│   │   ├── styles/
│   │   │   └── animations.css      # 动画样式
│   │   ├── types/
│   │   │   └── type.ts             # 类型定义
│   │   └── utils/
│   │       └── api.ts              # API 调用封装
│   ├── index.html
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── tsconfig.json              # TS 基础配置
│   ├── tsconfig.app.json          # 应用代码 TS 配置
│   ├── tsconfig.node.json         # Node/Vite 配置 TS 配置
│   ├── README.md
│   ├── .gitignore
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore                  # 仓库忽略规则
├── package.json                # 根目录脚本（一键启动前后端）
├── LICENSE
└── README.md
```

---

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| **Node.js + Express** | HTTP 服务框架 |
| **TypeScript** | 类型安全 |
| **Vercel AI SDK** (`ai`) | 流式对话编排框架 |
| **DeepSeek AI SDK** (`@ai-sdk/deepseek`) | DeepSeek 模型接入 |
| **MySQL** (`mysql2`) | 玩家数据持久化 |
| **Express Rate Limit** | 请求限流 |
| **CORS** | 跨域访问控制 |
| **Zod** | 数据校验 |
| **dotenv** | 环境变量管理 |
| **Hugging Face Transformers** (`@xenova/transformers`) | 本地 Embedding 推理（RAG 记忆检索） |

### 前端

| 技术 | 用途 |
|------|------|
| **React 19** | UI 框架 |
| **TypeScript** | 类型安全 |
| **Vite** | 构建工具 |
| **Tailwind CSS v4** | 样式框架 |
| **React Router v7** | 客户端路由 |
| **Axios** | HTTP 请求 |
| **Lucide React** | 图标库 |
| **clsx + tailwind-merge** | 样式合并工具 |

---

## 快速开始

### 前置要求

- Node.js ≥ 20.19（Vite 8 要求）
- MySQL 服务
- DeepSeek API Key

### 1. 克隆并安装依赖

```bash
# 安装后端依赖
cd anita-backend
npm install

# 安装前端依赖
cd ../anita-frontend
npm install
```

### 2. 配置环境变量

编辑 `anita-backend/.env`（该文件已被 .gitignore 忽略，不会提交）：

```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=anita_db
```

> 注意：`PORT` 必须为 3000——前端硬编码请求 `http://localhost:3000/api`，后端默认端口为 3001，仅靠 .env 覆盖。
>
> 记忆系统的 Embedding 模型（`Xenova/all-MiniLM-L6-v2`）会自动从 hf-mirror 镜像拉取，无需额外配置。

### 3. 初始化数据库

```sql
CREATE DATABASE anita_db;
```

（后端首次启动时会自动创建 `memories` 与 `user_sessions` 表。）

### 4. 启动开发服务

在根目录使用统一脚本（需要两个终端分别执行）：

```bash
# 终端 1 —— 启动后端（端口来自 .env，默认 3000）
npm run dev:backend

# 终端 2 —— 启动前端（端口 5173）
npm run dev:frontend
```

打开浏览器访问 `http://localhost:5173` 即可进入游戏。

---

## 功能特性

- **🤖 AI 驱动叙事** — 基于 DeepSeek 大语言模型的动态剧情生成
- **💬 流式对话** — SSE 流式响应，逐字输出对话内容
- **🧠 记忆系统** — RAG 向量检索历史记忆，融入对话上下文
- **⚙️ 工具调用** — AI 通过 `updateSystemState` 工具实时调整生命值/理智/威胁
- **📦 背包系统** — 初始道具清单与背包信息展示
- **⚡ 状态面板** — 生命值、理智值、集成度实时监控
- **⚠️ 环境威胁提示** — 动态环境事件与威胁指示
- **🔄 自动存档** — 游戏进度自动保存（1 秒防抖）
- **🔊 音效反馈** — 打字机音效与受击警报音
- **🎮 CRT 终端特效** — 扫描线、故障抖动等复古风格
- **🔒 速率限制** — 全局限流 + 聊天接口专属限流

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/api/chat` | AI 对话（流式 SSE：`text` / `tool` / `end` 事件，`ping` 心跳保活，`error` 故障通知） |
| `GET` | `/api/load/:playerId` | 读取玩家存档，无记录则自动创建新档案 |
| `POST` | `/api/save` | 保存玩家存档（有则更新，无则新建） |

---

## 许可

MIT
