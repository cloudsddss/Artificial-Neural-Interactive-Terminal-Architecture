import axios from 'axios';
import type { ScenarioMeta, ScenarioSaveInfo, PlayerState, Message } from '../types/type';

// 统一的后端地址来源（axios 与流式 fetch 共用）
// VITE_ 前缀是 Vite 暴露给前端的强制要求；.env 不随 git 提交，必须留默认值兜底
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';


// Token 在 localStorage 中的固定 Key
export const TOKEN_KEY = 'anita_auth_token';
// 操作员代号在 localStorage 中的 Key
export const PLAYER_ID_KEY = 'anita_player_id';
/** 
 * 统一的 Token 存取函数
 */
export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);// 读取 Token
export const setStoredToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);// 写入 Token
export const removeStoredToken = (): void => localStorage.removeItem(TOKEN_KEY);// 删除 Token


// 🛡️ 新增：操作员代号持久化管理
export const getStoredPlayerId = (): string | null => localStorage.getItem(PLAYER_ID_KEY);
export const setStoredPlayerId = (id: string): void => localStorage.setItem(PLAYER_ID_KEY, id);
export const removeStoredPlayerId = (): void => localStorage.removeItem(PLAYER_ID_KEY);
// 🛡️ 新增：一键安全登出（清空所有凭证）
export const clearAuthSession = (): void => {
  removeStoredToken();
  removeStoredPlayerId();
};


// 统一的 HTTP 请求实例
// 非流式 API（存档/读档）使用此实例，流式 API（聊天）仍用 fetch
const api = axios.create({
  baseURL: `${API_BASE}/api`, // 统一的 API 前缀
  timeout: 10000, // 10 秒超时
});
// 请求拦截器：未来可统一附加 token、playerId 等
api.interceptors.request.use((config) => {
  config.headers['x-request-id'] = crypto.randomUUID(); // 前端主动给每次请求贴标签
  // 可以在这里统一附加 token、playerId 等
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => {
    /*** 静默续期：如果后端响应头包含新的 token，前端自动更新无感换新 */
    const refreshedToken = response.headers['x-refresh-token'];
    if (refreshedToken) {
      setStoredToken(refreshedToken);
    }
    return response;
  },  // 2xx 直接返回
  (error) => {
    // 🛡️ 401 凭证失效统一兜底：清空脏 Token，退回登录页
    if (error.response?.status === 401) {
      console.warn('[A.N.I.T.A.] 神经凭证已失效或过期，重置登录态');
      clearAuthSession(); // 👈 替换原本单一的 removeStoredToken()
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    console.error('[A.N.I.T.A. API ERROR]', error.message);
    return Promise.reject(error);
  }
);

export default api;

// ============================================================
// ★ 业务 API 函数集中管理 ★
// ============================================================
// 1. 获取所有剧本列表
export const fetchScenarios = async (): Promise<ScenarioMeta[]> => {
  const { data } = await api.get('/scenarios');
  return data.scenarios || data || [];
};
// 👉 新增：根据剧本ID获取单个剧本完整配置（包含地图拓扑）
export const fetchScenarioById = async (scenarioId: string): Promise<ScenarioMeta> => {
  const { data } = await api.get(`/scenarios/${scenarioId}`);
  return data;
};
// 2. 获取指定玩家在所有剧本的存档概览（大厅卡片用）
export const fetchPlayerSaves = async (playerId: string): Promise<ScenarioSaveInfo[]> => {
  try {
    const { data } = await api.get(`/saves/${playerId}`);
    return data.saves || [];
  } catch {
    return []; // 离线或无存档时安全返回空数组
  }
};
// 3. 读取（或初始化）指定剧本的档案
export const loadScenarioSession = async (playerId: string, scenarioId?: string): Promise<{
  playerState: PlayerState;
  messages: Message[];
}> => {
  const url = scenarioId ? `/load/${playerId}/${scenarioId}` : `/load/${playerId}`;
  const { data } = await api.get(url);
  return data;
};
// 4. 保存玩家游戏进度
export const savePlayerSession = async (payload: {
  playerId: string;
  scenarioId?: string;
  playerState: PlayerState;
  messages: Message[];
}): Promise<boolean> => {
  const { data } = await api.post('/save', payload);
  return data.success;
};
// 5. 操作员登录换取 JWT Token
export const loginPlayer = async (playerId: string): Promise<{
  success: boolean;
  token: string;
  playerId: string;
}> => {
  const { data } = await api.post('/login', { playerId });
  if (data.token) {
    setStoredToken(data.token);
    setStoredPlayerId(data.playerId); // 👈 加上这一行，持久化代号
  }
  return data;
};
