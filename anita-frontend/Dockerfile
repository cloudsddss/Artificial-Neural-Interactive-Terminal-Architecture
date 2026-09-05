# ============================================================
# 阶段 1：构建阶段 (Builder)
# 使用 Vite 完成 React 前端代码压缩与打包
# ============================================================
FROM docker.m.daocloud.io/library/node:22-alpine AS builder

WORKDIR /app

# 注入相对路径 API 基地址，让所有网络请求直接走 Nginx 逆向代理（免去跨域与端口硬编码）
ENV VITE_API_BASE_URL=""

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# 阶段 2：生产运行时 (Production Web Server)
# 使用超高并发、超轻量级的 Nginx Alpine (仅 20MB)
# ============================================================
FROM docker.m.daocloud.io/library/nginx:alpine AS runner

# 拷贝自定义的生产级 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段提取静态 HTML/JS/CSS 产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]