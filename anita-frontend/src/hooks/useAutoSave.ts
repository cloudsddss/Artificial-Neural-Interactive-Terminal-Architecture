// ============================================================
// 自动静默存档 Hook
// 职责：playerState 或 messages 变化后，1 秒防抖自动保存到后端
// ============================================================

import { useEffect, useRef } from "react";
import type { Message, PlayerState } from "../types/type";
import api from '../utils/api'


type UseAutoSaveParams = {
  playerId: string;         // 操作员代号，为空则不存档
  isLoggedIn: boolean;      // 是否已登录，未登录不存档
  playerState: PlayerState; // 当前玩家状态
  messages: Message[];      // 当前对话历史
};


export function useAutoSave({ playerId, isLoggedIn, playerState, messages }: UseAutoSaveParams) {
  //首次挂载的时候跳过初始化阶段
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // 1 秒防抖：playerState/messages 短时间内连续变化时只存最后一次
    const timer = setTimeout(() => {
      api.post('/save', { playerId, playerState, messages })
      .then(() => console.log('静默存档成功'))
      .catch(e => console.error('静默存档失败:', e));
    }, 1000);
    // 清除定时器
    return () => clearTimeout(timer);
  }, [playerState, messages,playerId, isLoggedIn]);

}
