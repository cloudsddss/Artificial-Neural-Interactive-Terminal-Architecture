# ANITA — Artificial Neural Interactive Terminal Architecture

**人工神经交互终端架构** · 科幻交互引擎

一个基于 AI 驱动的沉浸式科幻游戏引擎，后端使用 Express + TypeScript + DeepSeek AI，前端使用 React + Vite + Tailwind CSS，通过流式对话为玩家提供动态叙事体验。

---

## 项目结构

```
anita/
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
│   ├── .env                    # 环境变量配置
│   ├── package.json
│   └── tsconfig.json
│
├── anita-frontend/             # 前端应用
│   ├── src/
│   │   ├── App.tsx             # 路由入口（登录 → 游戏）
│   │   ├── main.tsx            # 挂载入口
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
│   └── package.json
│
├── 交互式科幻引擎：MVP 阶段产品需求文档 (PRD).md
├── 交互式科幻引擎：技术选型白皮书.md
└── README.md
```

---

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| **Node.js + Express** | HTTP 服务框架 |
| **TypeScript** | 类型安全 |
| **DeepSeek AI SDK** (`@ai-sdk/deepseek`) | AI 对话与流式响应 |
| **MySQL** (`mysql2`) | 玩家数据持久化 |
| **Express Rate Limit** | 请求限流 |
| **Zod** | 数据校验 |
| **dotenv** | 环境变量管理 |
| **Hugging Face Transformers** (`@xenova/transformers`) | 本地 AI 推理 |

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

- Node.js ≥ 18
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

编辑 `anita-backend/.env`：

```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=anita_db

HF_ENDPOINT=https://hf-mirror.com
```

### 3. 初始化数据库

```sql
CREATE DATABASE anita_db;
```

### 4. 启动开发服务

```bash
# 启动后端（端口 3000）
cd anita-backend
npm start

# 新终端 —— 启动前端（端口 5173）
cd anita-frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173` 即可进入游戏。

---

## 功能特性

- **🤖 AI 驱动叙事** — 基于 DeepSeek 大语言模型的动态剧情生成
- **💬 流式对话** — SSE 流式响应，逐字输出对话内容
- **📦 背包系统** — 物品拾取、使用与管理
- **⚡ 状态面板** — 生命值、能量、位置等实时状态
- **⚠️ 环境危险提示** — 动态环境事件与威胁指示
- **🔄 自动存档** — 游戏进度自动保存
- **🎮 CRT 终端特效** — 扫描线、故障抖动等复古风格
- **🔒 速率限制** — 全局限流 + 聊天接口专属限流

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/api/chat` | AI 对话（流式 SSE） |
| `POST` | `/api/login` | 玩家登录 |
| `POST` | `/api/session` | 创建/恢复会话 |

---

## 许可

MIT
