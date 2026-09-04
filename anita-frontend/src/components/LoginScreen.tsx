import { useState } from "react";
import { LogIn, Terminal, AlertTriangle } from "lucide-react"; // 可选：加入警报图标
import { loginPlayer } from "../utils/api"; // 👈 引入登录 API


//登录成功后调用的回调函数
type LoginScreenProps = {
  onLoginSuccess: (playerId: string) => void;
};


export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    // 初始化用户id和加载状态
    const [playerId, setPlayerId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // 👈 记录认证错误信息


    // 登录逻辑：调用后端神经防火墙换取 JWT Token
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!playerId.trim() || isLoading) return;

        setErrorMessage(null);
        setIsLoading(true);

        try {
            const cleanId = playerId.trim().toUpperCase().replace(/\s+/g, '_');
            // 🛡️ 调用后端 POST /api/login，自动完成签名验证并将 Token 写入 localStorage
            const result = await loginPlayer(cleanId);
            
            // 认证成功，通知父组件进入大厅
            onLoginSuccess(result.playerId);
        } catch (err: any) {
            console.error('Authentication failed:', err);
            const tip = err.response?.data?.message || '神经接入认证失败：后端服务未响应或拒绝连接。';
            setErrorMessage(tip);
        } finally {
            setIsLoading(false);
        }
    };

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
            {/* 🛡️ 认证失败警告提示 */}
            {errorMessage && (
                <div className="text-red-400 text-xs bg-red-950/40 border border-red-800 p-2.5 flex items-center gap-2 tracking-wide animate-pulse">
                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                    <span>[SECURITY_ALERT] {errorMessage}</span>
                </div>
            )}
            </form>
        </div>
        </div>
    );

}