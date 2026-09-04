// 流式聊天自定义 Hook
// 职责：管理聊天状态 + 玩家状态 + SSE 流式通信 + 音效触发 + 静默存档
import { useState, useRef, useEffect } from 'react';
import type { Message, PlayerState, Clue } from '../types/type';
import { useAudio } from './useAudio';
import api, { API_BASE, savePlayerSession } from '../utils/api';
// ============================================================
// 返回值类型定义
// ============================================================
export type UseStreamingChatReturn = {
  messages: Message[];                              // 聊天消息列表
  playerState: PlayerState;                         // 玩家状态
  isLoading: boolean;                               // 是否正在加载，期间禁用输入框
  isTakingDamage: boolean;                          // 是否正在播放受击动效，800ms 后自动复位
  sendMessage: (text: string) => void;              // 发送用户消息，触发流式请求
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // 指向消息列表底部的 DOM 节点，用于自动滚动
  audioEnabled: boolean;                            // 音频系统是否已初始化
  initAudio: () => void;                            // 初始化音频（暴露给 Terminal 的音频按钮）
};
// ============================================================
// 超时与容错常量
// ============================================================
const FIRST_BYTE_TIMEOUT = 30_000;   // 请求发出后 30s 未收到任何 SSE 事件 → 强断
const IDLE_TIMEOUT = 60_000;   // 两个事件间隔 > 60s（心跳每 15s 重置）→ 判死

// ============================================================
// Hook 主体
// 职责：管理聊天状态 + 玩家状态 + SSE 流式通信 + 音效触发
// 传入玩家 ID，可选传入初始数据（登录存档恢复时使用）
// ============================================================

// hook 参数类型：playerId 必填，initialData 可选（来自登录存档）
type UseStreamingChatOptions = {
  playerId: string;
  scenarioId?: string; // 可选，当前剧本 ID，用于存档
  initialMessages?: Message[];    // 登录时传入的对话历史
  initialPlayerState?: PlayerState; // 登录时传入的玩家状态
};

export function useStreamingChat(options: UseStreamingChatOptions): UseStreamingChatReturn {
  const { playerId, scenarioId, initialMessages, initialPlayerState } = options;

  // 获取音频 hook 的方法
  const { audioEnabled, initAudio, playTypingSound, playAlarmSound } = useAudio();

  // 组件卸载时中断在途请求（放在 hook 顶层）
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ----------------------------------------------------------
  // 第一部分：状态声明
  // 有初始数据时用初始数据，否则用默认值
  // ----------------------------------------------------------
  const [messages, setMessages] = useState<Message[]>(
    initialMessages ?? [{ role: 'assistant', content: 'A.N.I.T.A. 系统已上线。检测到未授权的生命体征。\n请表明你的意图。' }]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isTakingDamage, setIsTakingDamage] = useState(false);

  const [playerState, setPlayerState] = useState<PlayerState>(
    initialPlayerState ?? {
      hp: 100,
      sanity: 80,
      integration: 10,
      inventory: ['手电筒', '一级权限卡'],
      hazards: []
    }
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------
  // 第二部分：自动滚动
  // messages 变化时平滑滚动到消息列表底部
  // ----------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----------------------------------------------------------
  // 第三部分：静默存档（1 秒防抖）
  // 直接监听内部的 messages 和 playerState，引用变化即触发
  // ----------------------------------------------------------
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!playerId) return;

    // 跳过首次挂载，避免将初始数据覆盖后端已有存档
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // 1 秒防抖：流式回复时 messages 可能每秒变化几十次，只存最后一次
    const timer = setTimeout(() => {
      // 👉 替换原本手写的 api.post('/save', ...)
      savePlayerSession({ playerId, scenarioId, playerState, messages })
        .catch(e => console.error('静默存档失败:', e));
    }, 1000);

    // 清理函数：依赖变化时取消上一次定时器，重新计时
    return () => clearTimeout(timer);
  }, [messages, playerState, playerId]);

  // ----------------------------------------------------------
  // 存档兜底：页面刷新/关闭时，防抖定时器会被直接丢弃，
  // 最后 1 秒内的对话会丢 —— 用 ref 镜像最新状态，pagehide 时 keepalive 落库
  // （keepalive 请求在页面销毁后仍会送达服务器）
  // ----------------------------------------------------------
  const messagesRef = useRef(messages);
  const playerStateRef = useRef(playerState);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  useEffect(() => {
    const flushOnExit = () => {
      if (!playerId) return;
      // 👉 加上 scenarioId，防止关网页瞬间的最后一笔数据存丢剧本归属
      const data = { playerId, scenarioId, playerState: playerStateRef.current, messages: messagesRef.current };
      const body = JSON.stringify(data);
      // keepalive 请求体有 64KB 上限（Chrome/Firefox），超长退化为普通请求尽力而为
      if (body.length > 60_000) {
        api.post('/save', data).catch(e => console.error('卸载存档失败:', e));
        return;
      }
      fetch(API_BASE + '/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(e => console.error('卸载存档失败:', e));
    };
    window.addEventListener('pagehide', flushOnExit);
    return () => window.removeEventListener('pagehide', flushOnExit);
  }, [playerId]);

  // ----------------------------------------------------------
  // 第三部分：核心流式通信
  // ----------------------------------------------------------
  const sendMessage = async (userMsg: string) => {
    // 首次发送时初始化音频（浏览器要求用户交互才能创建 AudioContext）
    if (!audioEnabled) initAudio();

    if (!userMsg.trim() || isLoading) return;

    const trimmed = userMsg.trim();
    
    // ============================================================
    // ★ 本地斜杠指令系统 (Local Slash Commands) — 0 网络开销
    // ============================================================
    if (trimmed.startsWith('/')) {
      const cmd = trimmed.toLowerCase();
      if (cmd === '/clear') {
        setMessages([{ role: 'assistant', content: 'A.N.I.T.A. 终端屏幕已重置。' }]);
        return;
      }
      if (cmd === '/help') {
        const helpText = `\n[A.N.I.T.A. 终端本地指令系统]\n/help      - 查看可用指令列表\n/clear     - 清空终端通讯记录\n/status    - 快速体征与神经状态诊断\n/inventory - 随身物品库速查`;
        setMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: helpText }
        ]);
        return;
      }
      if (cmd === '/status') {
        const statusText = `\n[操作员生命体征诊断报告]\n生命值 (HP): ${playerState.hp}%\n理智值 (SANITY): ${playerState.sanity}%\n神经同步率: ${playerState.integration}%\n当前环境威胁: ${playerState.hazards.join(', ') || '无威胁'}`;
        setMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: statusText }
        ]);
        return;
      }
      if (cmd === '/inventory') {
        const invText = `\n[随身物资清单]\n${(playerState.inventory ?? []).map(i => `• ${i}`).join('\n') || '空无一物'}`;
        setMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: invText }
        ]);
        return;
      }
    }

    // 构建新的消息列表（包含用户新消息）
    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    // 在列表末尾预占一个 AI 空消息，后续流式追加文字到这条消息
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // ---- 请求控制器 + 计时器（本次请求私有）----
    const controller = new AbortController();
    abortRef.current = controller;
    let firstByteTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;          // 区分"超时强断"与"普通错误"，决定提示文案
    let handledError = false;      // 防止 error 事件 + catch 双重重写消息
    let receivedEnd = false;       // 是否收到正常结束事件 end，用于识别流中途死亡

    const clearTimers = () => {
      if (firstByteTimer) clearTimeout(firstByteTimer);
      if (idleTimer) clearTimeout(idleTimer);
      firstByteTimer = idleTimer = undefined;
    };
    // 每个 SSE 事件到达时调用：清首字节计时，重置空闲计时
    const onEventArrived = () => {
      if (firstByteTimer) { clearTimeout(firstByteTimer); firstByteTimer = undefined; }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { timedOut = true; controller.abort(); }, IDLE_TIMEOUT);
    };

    try {
      // ---- 首字节超时：30s 没等到任何事件（含 ping）就 abort ----
      firstByteTimer = setTimeout(() => { timedOut = true; controller.abort(); }, FIRST_BYTE_TIMEOUT);

      const response = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, playerState, playerId, scenarioId }),
        signal: controller.signal                     // ★ 超时强断的核心
      });

      if (!response.body) throw new Error('服务器连接错误，请重试');

      // [步骤2] 获取流的读取器和解码器
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      // [步骤3] 网络缓冲区
      // 网络包可能在任意字节处截断，用 buffer 拼接不完整的行
      // { stream: true } 让解码器保留截断的多字节字符（如中文 UTF-8 的 3 字节）
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按双换行符切分 SSE 块（SSE 协议用 \n\n 分隔不同事件）
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || ''; // 最后一个可能不完整，留在 buffer 等下一个包

        // [步骤4] 逐块解析 SSE 协议
        for (const block of blocks) {
          if (block.trim() === '') continue;

          // 解析 SSE 块：每块包含 event: 和 data: 两行
          const lines = block.split('\n');
          let eventType = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim(); // 提取事件类型（text/tool/end）
            } else if (line.startsWith('data:')) {
              eventData = line.slice(5).trim(); // 提取数据内容
            }
          }
          onEventArrived();    // ★ 收到任何事件都刷新计时
          // --- 心跳：只刷新计时，不渲染、不发声 ---
          if (eventType === 'ping') continue;
          // --- 剧情文本流 ---
          if (eventType === 'text') {
            try {
              const textChunk = JSON.parse(eventData);
              // 触发打字机音效
              playTypingSound();

              // 深拷贝 Message 对象，避免 React StrictMode 双重执行导致内容重复
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                const updatedLastMsg = {
                  ...lastMsg,
                  content: lastMsg.content + (typeof textChunk === 'string' ? textChunk : String(textChunk))
                };
                return [...prev.slice(0, -1), updatedLastMsg];
              });
            } catch (error) {
              console.error("文本解析错误:", error, eventData);
            }
          }

          // --- 工具调用流（扣血/掉理智/新威胁） ---
          else if (eventType === 'tool') {
            try {
              const payload = JSON.parse(eventData);
              const toolName = payload.toolName || (payload.hpChange !== undefined ? 'updateSystemState' : '');
              const args = payload.args || payload;

              // 1. 状态数值与威胁更新
              if (toolName === 'updateSystemState') {
                if (args.systemLog) {
                  console.warn(`%c[A.N.I.T.A. SYSTEM LOG]%c ${args.systemLog}`, 'color: red; font-weight: bold;', 'color: inherit;');
                }

                const hpDiff = args.hpChange ? Number(args.hpChange) : 0;
                const sanDiff = args.sanityChange ? Number(args.sanityChange) : 0;
                const syncDiff = args.integrationChange ? Number(args.integrationChange) : 0;

                // 触发警报音效与屏幕受击震动
                if (hpDiff !== 0 || sanDiff !== 0 || syncDiff !== 0 || (args.newHazards && args.newHazards.length > 0)) {
                  playAlarmSound();
                  setIsTakingDamage(true);
                  setTimeout(() => setIsTakingDamage(false), 800);
                }

                // 更新玩家状态
                setPlayerState(prev => {
                  const updatedHazards = args.newHazards
                    ? [...new Set([...prev.hazards, ...args.newHazards])]
                    : prev.hazards;
                  return {
                    ...prev,
                    hp: Math.max(0, Math.min(100, prev.hp + hpDiff)),
                    sanity: Math.max(0, Math.min(100, prev.sanity + sanDiff)),
                    integration: Math.max(0, Math.min(100, prev.integration + syncDiff)),
                    hazards: updatedHazards
                  };
                });
                // 💡【核心改动】：已移除往 messages[last].content 追加 "[系统警告: ...]" 的代码，保持对话纯净
              }

              // 2. 发现线索
              else if (toolName === 'discoverClue') {
                const { clueId, title, content } = args;
                const newClue: Clue = {
                  clueId,
                  title,
                  content,
                  discoveredAt: new Date().toLocaleTimeString(),
                };
                setPlayerState(prev => {
                  const existingIndex = (prev.clues || []).findIndex(c => c.clueId === clueId);
                  if (existingIndex >= 0) {
                    const updated = [...prev.clues!];
                    updated[existingIndex] = newClue;
                    return { ...prev, clues: updated };
                  }
                  return { ...prev, clues: [...(prev.clues || []), newClue] };
                });
                // 💡【核心改动】：已移除往 messages[last].content 追加 "[数据归档: ...]" 的代码
              }

              // 3. 使用背包物品
              else if (toolName === 'useInventoryItem') {
                const { item } = args;
                setPlayerState(prev => ({
                  ...prev,
                  inventory: prev.inventory?.filter(i => i !== item) ?? [],
                }));
                // 💡【核心改动】：已移除往 messages[last].content 追加 "[物品使用]" 的代码
              }
            } catch (error) {
              console.error("处理工具调用失败:", error);
            }
          }

          // --- 后端结构化错误：终端输出系统警报，终止本次流 ---
          else if (eventType === 'error') {
            handledError = true;
            let msg = 'A.N.I.T.A. 系统故障';
            try { msg = JSON.parse(eventData).message || msg; } catch { /* 非 JSON 用默认 */ }
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + `\n\n[系统警报] ${msg}\n` }];
            });
            controller.abort();    // 停止继续读流
            break;
          }
          // --- 正常结束 ---
          else if (eventType === 'end') { receivedEnd = true; console.log("通讯结束"); }
        }
      }

      // 流异常终止：收到 EOF 但没等到 end/error 事件（连接断开/后端进程死亡）
      // 给最后一条 AI 回复补中断标记，避免半截回复被静默当成完整对话存档
      if (!receivedEnd && !handledError && !timedOut) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + '\n[A.N.I.T.A. 通讯中断。]' }];
        });
      }
    } catch (error: any) {
      console.error("流式读取失败:", error);
      // 超时强断 → 专用提示文案
      if (error?.name === 'AbortError' && timedOut) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + '\n[A.N.I.T.A. 通信链路中断，请求超时]' }];
        });
      }
      // 网络错误 / 服务器拒绝（且 error 事件未处理过）→ 原有提示
      else if (!handledError) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + '\n[A.N.I.T.A. 通讯中断。]' }];
        });
      }
    } finally {
      clearTimers();                 // 清理本次请求计时器
      abortRef.current = null;
      setIsLoading(false);           // ★ 输入框解锁（Terminal.tsx 的 disabled 自动恢复）
    }
  };

  // ----------------------------------------------------------
  // 第四部分：暴露给外部的接口
  // ----------------------------------------------------------
  return {
    messages,
    playerState,
    isLoading,
    isTakingDamage,
    sendMessage,
    messagesEndRef,
    audioEnabled,
    initAudio,
  };
}
