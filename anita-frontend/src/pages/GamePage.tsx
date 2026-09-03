// GamePage — 游戏主界面
// 职责：从路由状态接收登录数据，调用 hook 管理通信和存档，组装游戏 UI
import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import '../styles/animations.css';
import { useStreamingChat } from '../hooks/useStreamingChat';
import ScanlineOverlay from '../components/ScanlineOverlay';
import Terminal from '../components/Terminal';
import StatusPanel from '../components/StatusPanel';
import InventoryPanel from '../components/InventoryPanel';
import HazardPanel from '../components/HazardPanel';
import CluePanel from '../components/CluePanel';
import api from '../utils/api';
import type { Message, PlayerState } from '../types/type';

// 路由状态的类型定义：LoginScreen 通过 navigate('/game', { state }) 传入
type LocationState = {
  playerId: string;
  playerState: PlayerState;
  messages: Message[];
};

export default function GamePage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  // 挂载时从后端重新拉取最新档案：
  // 刷新后 react-router 会从 history.state 恢复 location.state（登录时的旧快照），
  // 而对话进行中的最新数据已在数据库 —— 必须重新加载，否则会显示过期的"历史对话"
  const [sync, setSync] = useState<{ playerState: PlayerState; messages: Message[] } | null>(null);

  useEffect(() => {
    if (!state?.playerId) return;
    let cancelled = false;
    api.get(`/load/${state.playerId}`)
      .then(({ data }) => { if (!cancelled) setSync({ playerState: data.playerState, messages: data.messages }); })
      // 拉取失败（后端离线等）：回退到 location.state 快照，不阻塞进游戏
      .catch(() => { if (!cancelled) setSync({ playerState: state.playerState, messages: state.messages }); });
    return () => { cancelled = true; };
  }, [state?.playerId]);

  // 如果直接访问 /game 而没有登录数据，重定向回登录页
  if (!state || !state.playerId) {
    return <Navigate to="/" replace />;
  }

  // 档案同步完成前先占位，避免先用旧快照渲染再被替换
  if (!sync) {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono p-4 animate-pulse">
        [A.N.I.T.A.] 正在同步操作员档案...
      </div>
    );
  }

  return (
    <GameContent
      playerId={state.playerId}
      initialPlayerState={sync.playerState}
      initialMessages={sync.messages}
    />
  );
}

// 游戏主界面：独立组件以保证 hooks 数量稳定（GamePage 在同步完成前会提前返回）
function GameContent({ playerId, initialPlayerState, initialMessages }: {
  playerId: string;
  initialPlayerState: PlayerState;
  initialMessages: Message[];
}) {
  // 流式通信 hook：传入档案数据作为初始值，后续由 hook 内部管理状态
  const {
    messages,
    playerState,
    isLoading,
    isTakingDamage,
    sendMessage,
    messagesEndRef,
    audioEnabled,
    initAudio,
  } = useStreamingChat({
    playerId,
    initialMessages,
    initialPlayerState,
  });

  // 在 GameContent 内部计算是否处于认知污染状态
  const isCorrupted = playerState.sanity < 30;
  // 游戏界面
  return (
    <div className={`min-h-screen font-mono p-4 md:p-8
      flex flex-col md:flex-row gap-6 transition-colors duration-200
      ${isTakingDamage ? 'bg-red-950 animate-shake text-red-500' : 'bg-black text-green-500'}
      ${isCorrupted ? 'terminal-glitch' : ''}`}>
      <ScanlineOverlay />

      <Terminal
        messages={messages}
        isLoading={isLoading}
        onSend={sendMessage}
        messagesEndRef={messagesEndRef}
        audioEnabled={audioEnabled}
        onInitAudio={initAudio}
        playerId={playerId}
      />

      <div className="w-full md:w-80 flex flex-col gap-4 z-40">
        <StatusPanel playerState={playerState} isTakingDamage={isTakingDamage} />
        <InventoryPanel inventory={playerState.inventory} />
        <HazardPanel hazards={playerState.hazards} />
        <CluePanel clues={playerState.clues} />
      </div>
    </div>
  );
}
