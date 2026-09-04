import { useState,useEffect } from 'react';
import type { Message } from '../types/type';
import { Terminal as TerminalIcon, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TerminalProps = {
  messages: Message[];
  isLoading: boolean;
  onSend: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  audioEnabled: boolean;
  onInitAudio: () => void;
  playerId: string;
};

// 本地可用斜杠指令配置
const SLASH_COMMANDS = [
  { cmd: '/help', desc: '查看终端本地可用指令清单' },
  { cmd: '/status', desc: '快速诊断生命体征与神经状态' },
  { cmd: '/inventory', desc: '随身物品与物资库速查' },
  { cmd: '/clear', desc: '清空终端屏幕通讯记录' },
];

export default function Terminal({
  messages,
  isLoading,
  onSend,
  messagesEndRef,
  audioEnabled,
  onInitAudio,
  playerId,
}: TerminalProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  // 历史命令回溯状态
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // 斜杠指令提示浮层状态
  const [suggestIndex, setSuggestIndex] = useState<number>(0);
  const showSuggestions = inputValue.startsWith('/') && !isLoading;
  const filteredCommands = showSuggestions
    ? SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(inputValue.toLowerCase()))
    : [];

  // 当过滤列表变化时，重置高亮索引为 0
  useEffect(() => {
    setSuggestIndex(0);
  }, [inputValue]);


  // 表单提交
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    // 保存到历史命令中
    setHistory(prev => [...prev, inputValue.trim()]);
    setHistoryIndex(-1);
    
    onSend(inputValue.trim());
    setInputValue('');
  };

  // 键盘 ↑ / ↓ 键历史命令切换
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (history.length === 0) return;
    // 斜杠指令提示浮层的键盘操作
    if(filteredCommands.length>0)
    {
      // 按 ↑ / ↓ 键切换高亮的命令
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        // 按 ↑ 键切换到上一个命令，如果已经是第一个命令，则循环到最后一个命令
        setSuggestIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        // 按 Tab 自动补全选中的命令
        setInputValue(filteredCommands[suggestIndex].cmd);
        return;
      }
    }  
    // 2. 普通情况下的历史命令回溯 (按 ↑ / ↓ 键)
    if (history.length > 0 && !inputValue.startsWith('/')) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setInputValue(history[nextIndex]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex === -1) return;
        const nextIndex = historyIndex + 1;
        if (nextIndex >= history.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(nextIndex);
          setInputValue(history[nextIndex]);
        }
      }
    }
  };

  return (
      <div className="flex-1 flex flex-col border border-green-800 rounded bg-black/50
        shadow-[0_0_15px_rgba(34,197,94,0.1)] relative overflow-hidden">

        {/* ---- 标题栏 ---- */}
        <div className="border-b border-green-800 p-3 flex items-center gap-2 bg-green-900/20">
          <TerminalIcon size={18} />
          <h1 className="font-bold tracking-widest text-sm">A.N.I.T.A. TACTICAL TERMINAL</h1>
          <div className="ml-auto flex items-center gap-4">
            {/* ★ 新增：返回任务大厅按钮 ★ */}
            <button
              type="button"
              onClick={() => navigate('/hub', { state: { playerId } })}
              className="text-xs border border-green-800/80 px-2 py-1 rounded hover:bg-green-900/30 hover:border-green-400 text-green-400 transition-colors"
            >
              ← 任务大厅
            </button>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-40">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'text-blue-400' : ''}`}>
                {msg.role === 'user' ? '> ' : ''}{msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* ---- 底部输入框容器 ---- */}
        <div className="relative z-40">
          {/* ★ 斜杠指令自动提示浮层 ★ */}
          {filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-black/95 border border-green-700 rounded shadow-[0_0_15px_rgba(34,197,94,0.2)] p-1 overflow-hidden text-xs z-50 backdrop-blur-sm">
              <div className="px-2 py-1 text-green-700 font-bold border-b border-green-900/60 flex justify-between">
                <span>LOCAL COMMANDS (可用终端指令)</span>
                <span className="text-[10px] text-green-800 font-mono">TAB 补全 / ⬆⬇ 选择</span>
              </div>
              <div className="divide-y divide-green-950/40">
                {filteredCommands.map((item, index) => {
                  const isSelected = index === suggestIndex;
                  return (
                    <div
                      key={item.cmd}
                      onClick={() => {
                        setInputValue(item.cmd);
                      }}
                      className={`px-2 py-1.5 flex items-center justify-between cursor-pointer rounded transition-colors ${
                        isSelected
                          ? 'bg-green-900/40 text-green-300 font-bold'
                          : 'text-green-500 hover:bg-green-950/40'
                      }`}
                    >
                      <span className="font-mono text-green-400">{item.cmd}</span>
                      <span className="text-green-600 text-[11px]">{item.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* 输入框表单 */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-green-800 flex gap-2">
            <span className="pt-2">{'>'}</span>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none placeholder-green-800/50"
              placeholder="输入指令 (输入 / 触发指令提示，支持 ↑/↓ 历史回溯)..."
              autoComplete="off"
              autoFocus
            />
            {isLoading && <span className="animate-spin text-green-500">|</span>}
          </form>
        </div>
      </div>
  );
}