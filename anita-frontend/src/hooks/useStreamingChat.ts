// 流式聊天自定义 Hook
// 职责：管理聊天状态 + 玩家状态 + SSE 流式通信 + 音效触发 + 静默存档
import { useState, useRef, useEffect } from 'react';
import type { Message, PlayerState } from '../types/type';
import { useAudio } from './useAudio';
import api from '../utils/api';

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
// Hook 主体
// 职责：管理聊天状态 + 玩家状态 + SSE 流式通信 + 音效触发
// 传入玩家 ID，可选传入初始数据（登录存档恢复时使用）
// ============================================================

// hook 参数类型：playerId 必填，initialData 可选（来自登录存档）
type UseStreamingChatOptions = {
  playerId: string;
  initialMessages?: Message[];    // 登录时传入的对话历史
  initialPlayerState?: PlayerState; // 登录时传入的玩家状态
};

export function useStreamingChat(options: UseStreamingChatOptions): UseStreamingChatReturn {
  const { playerId, initialMessages, initialPlayerState } = options;

  // 获取音频 hook 的方法
  const { audioEnabled, initAudio, playTypingSound, playAlarmSound } = useAudio();

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
      api.post('/save', { playerId, playerState, messages })
        .catch(e => console.error('静默存档失败:', e));
    }, 1000);

    // 清理函数：依赖变化时取消上一次定时器，重新计时
    return () => clearTimeout(timer);
  }, [messages, playerState, playerId]);

  // ----------------------------------------------------------
  // 第三部分：核心流式通信
  // ----------------------------------------------------------
  const sendMessage = async (userMsg: string) => {
    // 首次发送时初始化音频（浏览器要求用户交互才能创建 AudioContext）
    if (!audioEnabled) initAudio();

    if (!userMsg.trim() || isLoading) return;

    // 构建新的消息列表（包含用户新消息）
    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    // 在列表末尾预占一个 AI 空消息，后续流式追加文字到这条消息
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      // [步骤1] 发起 POST 请求，将对话历史,玩家状态,玩家 ID 发给后端
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, playerState, playerId })
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
              const args = JSON.parse(eventData);

              // 彩蛋：systemLog 仅在浏览器控制台可见，玩家看不到
              if (args.systemLog) {
                console.warn(
                  `%c[A.N.I.T.A. SYSTEM LOG]%c ${args.systemLog}`,
                  'color: red; font-weight: bold;',
                  'color: inherit;'
                );
              }

              // 类型容错：后端可能传字符串 "15"，用 Number() 确保是数字
              const hpDiff = args.hpChange ? Number(args.hpChange) : 0;
              const sanDiff = args.sanityChange ? Number(args.sanityChange) : 0;

              // 放宽判定：任何数值变化或新威胁都触发受击动效和音效
              if (hpDiff !== 0 || sanDiff !== 0 || (args.newHazards && args.newHazards.length > 0)) {
                playAlarmSound();
                setIsTakingDamage(true);
                setTimeout(() => setIsTakingDamage(false), 800); // 800ms 受击震动
              }

              // 更新玩家状态：数值钳制 0-100，威胁列表去重合并
              setPlayerState(prev => {
                const updatedHazards = args.newHazards
                  ? [...new Set([...prev.hazards, ...args.newHazards])]
                  : prev.hazards;
                return {
                  ...prev,
                  hp: Math.max(0, Math.min(100, prev.hp + hpDiff)),
                  sanity: Math.max(0, Math.min(100, prev.sanity + sanDiff)),
                  hazards: updatedHazards
                };
              });

              // 在聊天框插入系统警告（深拷贝避免 StrictMode 重复）
              let warningText = `\n\n[系统警告: 状态变更]`;
              if (args.hpChange) warningText += `\n生命体征: ${args.hpChange > 0 ? '+' : ''}${args.hpChange}`;
              if (args.sanityChange) warningText += `\n理智值: ${args.sanityChange > 0 ? '+' : ''}${args.sanityChange}`;
              if (args.newHazards && args.newHazards.length > 0) warningText += `\n新增威胁: ${args.newHazards.join(', ')}`;
              warningText += `\n\n`;

              // 追加到末尾 AI 消息（深拷贝，防止 StrictMode 双重执行重复内容）
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                const updatedLastMsg = { ...lastMsg, content: lastMsg.content + warningText };
                return [...prev.slice(0, -1), updatedLastMsg];
              });

            } catch (error) {
              console.error("处理工具调用失败:", error);
            }
          }

          // 流正常结束
          else if (eventType === 'end') {
            console.log("通讯结束");
          }
        }
      }
    } catch (error) {
      console.error("流式读取失败:", error);
      // 通讯中断提示（深拷贝）
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        const updatedLastMsg = { ...lastMsg, content: lastMsg.content + '\n[A.N.I.T.A. 通讯中断。]' };
        return [...prev.slice(0, -1), updatedLastMsg];
      });
    } finally {
      setIsLoading(false);
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
