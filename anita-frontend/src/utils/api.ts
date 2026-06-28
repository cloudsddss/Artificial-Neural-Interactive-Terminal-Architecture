import axios from 'axios';


// 统一的 HTTP 请求实例
// 非流式 API（存档/读档）使用此实例，流式 API（聊天）仍用 fetch
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
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