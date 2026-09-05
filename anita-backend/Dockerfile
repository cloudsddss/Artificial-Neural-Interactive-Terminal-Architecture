# ============================================================
# 阶段 1：构建阶段 (Builder)
# 在轻量 Node.js 镜像中完成依赖安装与 TypeScript 静态编译
# ============================================================
FROM docker.m.daocloud.io/library/node:22-slim AS builder

WORKDIR /app

# 优先拷贝依赖清单，最大化利用 Docker 缓存层
COPY package*.json ./

# 安装全量依赖（包含 tsc 编译器和测试类型）
RUN npm ci

# 拷贝后端源码并执行生产级编译
COPY . .
RUN npm run build

# ============================================================
# 阶段 2：生产运行时 (Production Runner)
# 抛弃所有编译工具和开发依赖，仅保留运行时最小体积
# ============================================================
FROM docker.m.daocloud.io/library/node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# 仅安装生产运行依赖（剔除开发依赖，体积缩减 70%）
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 从构建阶段精准提取编译后的 dist 产物
COPY --from=builder /app/dist ./dist

# 暴露后端通信端口
EXPOSE 3001

# 启动纯净高效的编译后 Node 服务
CMD ["node", "dist/server.js"]