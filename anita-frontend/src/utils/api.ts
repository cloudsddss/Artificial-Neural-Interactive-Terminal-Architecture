import axios from 'axios';

// 统一的后端地址来源（axios 与流式 fetch 共用）
// VITE_ 前缀是 Vite 暴露给前端的强制要求；.env 不随 git 提交，必须留默认值兜底
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// 统一的 HTTP 请求实例
// 非流式 API（存档/读档）使用此实例，流式 API（聊天）仍用 fetch
const api = axios.create({
  baseURL: `${API_BASE}/api`, // 统一的 API 前缀
  timeout: 10000, // 10 秒超时
});
// 请求拦截器：未来可统一附加 token、playerId 等
api.interceptors.request.use((config) => {
  // 可以在这里统一附加 token、playerId 等
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => response,  // 2xx 直接返回
  (error) => {
    console.error('[A.N.I.T.A. API ERROR]', error.message);
    return Promise.reject(error);
  }
);

export default api;