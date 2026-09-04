import axios from 'axios';
import type { ScenarioMeta, ScenarioSaveInfo, PlayerState, Message } from '../types/type';

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

// ============================================================
// ★ 业务 API 函数集中管理 ★
// ============================================================
// 1. 获取所有剧本列表
export const fetchScenarios = async (): Promise<ScenarioMeta[]> => {
  const { data } = await api.get('/scenarios');
  return data.scenarios || data || [];
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