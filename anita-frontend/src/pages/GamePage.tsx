// GamePage — 游戏主界面
// 职责：从路由状态接收登录数据，调用 hook 管理通信和存档，组装游戏 UI
import { useLocation, Navigate } from 'react-router-dom';
import '../styles/animations.css';
import { useStreamingChat } from '../hooks/useStreamingChat';
import ScanlineOverlay from '../components/ScanlineOverlay';
import Terminal from '../components/Terminal';
import StatusPanel from '../components/StatusPanel';
import InventoryPanel from '../components/InventoryPanel';
import HazardPanel from '../components/HazardPanel';
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

  // 如果直接访问 /game 而没有登录数据，重定向回登录页
  if (!state || !state.playerId) {
    return <Navigate to="/" replace />;
  }

  // 从路由状态取出登录时传来的数据
  const { playerId, playerState: initialState, messages: initialMessages } = state;

  // 流式通信 hook：传入登录数据作为初始值，后续由 hook 内部管理状态
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
    initialPlayerState: initialState,
  });

  // 游戏界面
  return (
    <div className={`min-h-screen font-mono p-4 md:p-8
      flex flex-col md:flex-row gap-6 transition-colors duration-200
      ${isTakingDamage ? 'bg-red-950 animate-shake text-red-500' : 'bg-black text-green-500'}`}>

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
      </div>
    </div>
  );
}
