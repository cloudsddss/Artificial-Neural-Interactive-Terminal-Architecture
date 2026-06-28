import { useState } from 'react';
import type { Message } from '../types/type';
import { Terminal as TerminalIcon, Volume2, VolumeX } from 'lucide-react';

// 终端组件的属性类型
type TerminalProps = {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string) => void;                    // 发送消息的回调函数
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // 消息列表底部锚点
  audioEnabled: boolean;                              // 音频系统是否已初始化
  onInitAudio: () => void;                            // 初始化音频的回调
  playerId: string;// 操作员ID
};

/**
 * 通讯终端 — 左侧面板
 * 包含：标题栏（含音频按钮）+ 消息列表 + 底部输入框
 */
export default function Terminal({ messages, isLoading, onSend, messagesEndRef, audioEnabled, onInitAudio, playerId }: TerminalProps) {

  // 输入框受控状态，属于 UI 层，不需要放 hook
  const [inputValue, setInputValue] = useState('');

  // 表单提交：回车键自动触发，无需额外监听 onKeyDown
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();                          // 阻止表单默认提交刷新页面
    if (!inputValue.trim() || isLoading) return; // 空内容或加载中不发送
    onSend(inputValue.trim());                   // 把文本交给 hook 处理
    setInputValue('');                           // 清空输入框
  };

  return (
    <div className="flex-1 flex flex-col border border-green-800 rounded bg-black/50
      shadow-[0_0_15px_rgba(34,197,94,0.1)] relative overflow-hidden">

      {/* ---- 标题栏 ---- */}
      <div className="border-b border-green-800 p-3 flex items-center gap-2 bg-green-900/20">
        <TerminalIcon size={18} />
        <h1 className="font-bold tracking-widest text-sm">A.N.I.T.A. TACTICAL TERMINAL</h1>

        <div className="ml-auto flex items-center gap-4">
          {/* 音频按钮：未初始化时黄色脉冲引导点击，已初始化后绿色常亮 */}
          <button type="button" onClick={onInitAudio}
            className={`text-xs flex items-center gap-1 z-50 relative ${audioEnabled ? 'text-green-400' : 'text-yellow-500 animate-pulse'}`}>
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {audioEnabled ? 'AUDIO ON' : 'CLICK TO INIT AUDIO'}
          </button>
          <span className="text-xs text-green-700 bg-green-900/30 px-2 py-1 rounded border border-green-800/50">
            ID: {playerId}
          </span>
        </div>
      </div>

      {/* ---- 消息列表 ---- */}
      {/* z-40 确保在扫描线层（z-50）下方可交互 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-40">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* AI 消息不设颜色类，继承根容器的 text-green-500，受击时跟随根容器一起变红 */}
            <div className={`max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'text-blue-400' : ''}`}>
              {msg.role === 'user' ? '> ' : ''}{msg.content}
            </div>
          </div>
        ))}
        {/* 锚点 div：位于消息列表最底部，useEffect 监听 messages 变化后滚动到这里 */}
        <div ref={messagesEndRef} />
      </div>

      {/* ---- 输入框 ---- */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-green-800 flex gap-2 relative z-40">
        <span className="pt-2">{'>'}</span>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none placeholder-green-800/50"
          placeholder="输入终端指令或动作描述..."
          autoComplete="off"
          autoFocus
        />
        {/* 加载中显示旋转竖线作为光标指示 */}
        {isLoading && <span className="animate-spin text-green-500">|</span>}
      </form>
    </div>
  );
}
