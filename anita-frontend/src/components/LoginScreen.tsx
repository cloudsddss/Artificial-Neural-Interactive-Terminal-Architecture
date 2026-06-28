import { useState } from "react";
import type { Message, PlayerState } from "../types/type";
import api from "../utils/api";
import { LogIn, Terminal } from "lucide-react";


//登录成功后调用的回调函数
type LoginScreenProps = {
  onLoginSuccess: (playerId: string, playerState: PlayerState, messages: Message[]) => void;
};


export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    // 初始化用户id和加载状态
    const [playerId, setPlayerId] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    //登录逻辑
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();// 阻止表单默认提交行为
        console.log('Login attempt for player:', playerId);
        if (!playerId.trim()) {
            return;
        }
        setIsLoading(true);
        //默认状态，如果后端没有返回数据
        let finalPlayerState: PlayerState = {
            hp: 100, sanity: 80, integration: 10,
            inventory: ['手电筒', '一级权限卡'], hazards: []
        };
        let finalMessages: Message[] = [];

        // 调用实际的登录API请求存档，如果为新的存档会返回默认值，为旧存档的话会返回存档数据
        try {
            const { data } = await api.get(`/load/${playerId}`);
            if(data.playerState) finalPlayerState = data.playerState;
            // 处理消息数据,判断是否为新的存档
            if(data.messages&&data.messages.length>0) finalMessages = data.messages;
            else 
            {
                finalMessages = [{ role: 'assistant', content: `[系统日志] 验证通过。操作员 [${playerId}] 档案已建立。\nA.N.I.T.A. 系统已上线。请表明你的意图。` }];
            }
        } catch (error) {
            console.warn('无法连接到后端存档服务器，将使用初始状态。', error);
            finalMessages = [{ role: 'assistant', content: `[系统离线] 无法连接到主脑档案库。\nA.N.I.T.A. 备用节点已上线。请表明你的意图。` }];
        }finally {
            setIsLoading(false);
            onLoginSuccess(playerId.toUpperCase().replace(/\s+/g, '_'), finalPlayerState, finalMessages);
        }
    }

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex items-center justify-center relative overflow-hidden">
        {/* 全屏扫描线滤镜 */}
        <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-20 crt-flicker" />

        <div className="border border-green-800 p-8 bg-black/80 shadow-[0_0_30px_rgba(34,197,94,0.15)] z-10 w-full max-w-md relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 animate-pulse"></div>

            <Terminal size={48} className="mx-auto mb-6 text-green-600" />
            <h1 className="text-3xl text-center font-bold tracking-widest mb-2">A.N.I.T.A.</h1>
            <p className="text-center text-xs text-green-800 mb-10 tracking-widest">AUTHORIZED PERSONNEL ONLY</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div>
                <label className="text-xs text-green-600 mb-2 block animate-pulse">{'>'} ENTER OPERATOR CODENAME:</label>
                <input
                type="text"
                value={playerId}
                onChange={e => setPlayerId(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full bg-transparent border-b border-green-800 py-2 text-green-400 outline-none focus:border-green-400 transition-colors uppercase placeholder-green-900/30 font-bold tracking-wider"
                placeholder="E.G. AGENT_007"
                autoFocus
                />
            </div>
            <button
                type="submit"
                disabled={!playerId.trim() || isLoading}
                className="mt-4 border border-green-800 py-3 text-sm hover:bg-green-900/30 hover:text-green-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <LogIn size={16} />
                {isLoading ? 'AUTHENTICATING...' : 'ACCESS TERMINAL'}
            </button>
            </form>
        </div>
        </div>
    );

}