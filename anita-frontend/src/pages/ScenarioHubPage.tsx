import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Play, RotateCcw, TerminalIcon } from "lucide-react";
import ScanlineOverlay from "../components/ScanlineOverlay";
import type { ScenarioMeta, ScenarioSaveInfo } from "../types/type";
import { fetchScenarios, fetchPlayerSaves, loadScenarioSession, clearAuthSession, getStoredPlayerId } from "../utils/api"; // 👈 引入清空凭证函数





export default function ScenarioHubPage() {
    const location = useLocation();// 获取当前路由信息
    const navigate = useNavigate();// 用于导航到其他路由
    //从路由中获取登录的操作员代号
    // 🛡️ 优先从路由状态取，若 F5 刷新导致路由状态丢失，则从本地持久化中恢复
    const playerId = (location.state as { playerId?: string })?.playerId || getStoredPlayerId();

    const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]); // 存储每个剧本元数据列表
    const [saves, setSaves] = useState<Record<string, ScenarioSaveInfo>>({}); // 存储玩家在各个剧本的存档概览（以 scenario_id 为键，渲染时 O(1) 查找）
    const [loading, setLoading] = useState(true); // 加载状态
    const [enteringId, setEnteringId] = useState<string | null>(null); // 正在进入的剧本ID（进入流程中锁定，防重复点击）
    
    // 🛡️ 如果既没有路由传参，本地也没找到操作员代号，则退回登录页
    if (!playerId) {
        return <Navigate to="/" replace />;
    }

    //1.并发拉取剧本元数据和玩家存档概览
    useEffect(() => {
        if (!playerId) {
            console.error("playerId is missing in route state");
            return;
        }
        // 竞态防护：组件卸载或依赖变化后，丢弃过期的异步结果
        let cancelled = false;
        // 任一请求结束（无论成败）计一次，全部结束后才解除加载态
        let pending = 2;
        setLoading(true);// 进入加载态
        const settle = () => {
            if (!cancelled && --pending === 0) setLoading(false);
        };

        // 1. 拉取所有剧本元数据
        fetchScenarios().then((scenariosRes) => {
            if (!cancelled) setScenarios(scenariosRes);
        }).catch((err) => {
            console.error("Failed to fetch scenarios:", err);
        }).finally(settle);
        // 2. 拉取玩家存档概览
        fetchPlayerSaves(playerId).then((savesRes) => {
            if (cancelled) return;
            // 存档数组 → Record 映射，按剧本 ID 直接取档
            const saveMap: Record<string, ScenarioSaveInfo> = {};
            for (const s of savesRes) saveMap[s.scenario_id] = s;
            setSaves(saveMap);
        }).catch((err) => {
            console.error("Failed to fetch saves:", err);
        }).finally(settle);

        return () => { cancelled = true; };
    }, [playerId]);

    //2.进入指定剧本：携带 playerId 与剧本初始状态跳转 /game
    const handleEnterScenario = async (scenarioId: string) => {
        setEnteringId(scenarioId);
        try {
        // 从后端读取（或初始化）对应剧本的数据
        const data = await loadScenarioSession(playerId!, scenarioId);
        navigate('/game', {
            state: {
            playerId,
            scenarioId,
            playerState: data.playerState,
            messages:  data.messages,
            },
        });
        } catch (err) {
        console.error('进入剧本失败:', err);
        setEnteringId(null);
        }
    };

    // 直接访问本页而没有登录数据，重定向回登录页（与 GamePage 的守卫策略一致）
    if (!playerId) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-green-500 font-mono p-4 animate-pulse flex items-center justify-center">
                [A.N.I.T.A.] 正在检索剧本档案库...
            </div>
        );
    }
    // 🛡️ 安全退出登录：销毁本地 Token 并重置路由
    const handleLogout = () => {
        clearAuthSession();
        navigate('/', { replace: true });
    };

    return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 flex flex-col relative overflow-hidden">
      <ScanlineOverlay />
      {/* ---- 顶栏 HUD ---- */}
      <header className="border-b border-green-800 pb-4 mb-8 flex flex-wrap items-center justify-between gap-4 z-40 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <TerminalIcon className="text-green-400" size={24} />
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-widest text-green-400">
              A.N.I.T.A. MISSION OPERATIONS HUB
            </h1>
            <p className="text-xs text-green-700">战术任务与生化档案选择大厅</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="border border-green-800/80 bg-green-950/30 px-3 py-1.5 rounded text-green-400">
            OPERATOR: <strong className="text-green-300">{playerId}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 border border-red-900/60 text-red-400 px-3 py-1.5 rounded hover:bg-red-950/30 hover:border-red-600 transition-colors"
          >
            <LogOut size={14} /> 退出登录
          </button>
        </div>
      </header>
      {/* ---- 剧本选择卡片矩阵 ---- */}
      <main className="flex-1 max-w-7xl w-full mx-auto z-40">
        {loading ? (
          <div className="text-center py-24 text-sm text-green-600 animate-pulse">
            [A.N.I.T.A.] 正在从轨道服务器同步战术任务档案...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map(scenario => {
              const save = saves[scenario.id];
              const isEntering = enteringId === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className="border border-green-800/70 rounded bg-black/70 hover:border-green-500/80 transition-all p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(34,197,94,0.05)] hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] relative group"
                >
                  {/* 状态指示角标 */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-yellow-500 font-bold tracking-wider">
                      {'★'.repeat(scenario.difficulty)}
                      <span className="text-zinc-700">{'★'.repeat(5 - scenario.difficulty)}</span>
                    </span>
                    {save ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-950/50 border border-green-800 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                        ACTIVE (HP {save.state.hp}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
                        UNEXPLORED
                      </span>
                    )}
                  </div>
                  {/* 标题与标语 */}
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-green-300 group-hover:text-green-200 transition-colors">
                      {scenario.name}
                    </h2>
                    <p className="text-xs text-green-700 mt-1">{scenario.tagline}</p>
                  </div>
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {scenario.tags.map(t => (
                      <span key={t} className="text-[10px] text-green-600 bg-green-950/30 px-1.5 py-0.5 rounded border border-green-900/50">
                        #{t}
                      </span>
                    ))}
                  </div>
                  {/* 简报正文 */}
                  <p className="text-xs text-green-600/90 leading-relaxed mb-6 flex-1 line-clamp-4">
                    {scenario.briefing}
                  </p>
                  {/* 初始物资预览 */}
                  <div className="border-t border-green-900/60 pt-3 mb-5 text-[11px] text-green-800 flex items-center justify-between">
                    <span>初始装备: {scenario.initialPlayerState?.inventory?.join(', ') || '标准物资'}</span>
                  </div>
                  {/* 进入按钮 */}
                  <button
                    onClick={() => handleEnterScenario(scenario.id)}
                    disabled={Boolean(enteringId)}
                    className={`w-full py-2.5 px-4 rounded text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      save
                        ? 'border-green-600 bg-green-950/40 text-green-300 hover:bg-green-900/50 hover:border-green-400'
                        : 'border-green-800 bg-black text-green-400 hover:bg-green-950/30 hover:border-green-500'
                    } disabled:opacity-50`}
                  >
                    {isEntering ? (
                      <span className="animate-pulse">SYNCHRONIZING...</span>
                    ) : save ? (
                      <>
                        <RotateCcw size={14} /> 恢复此档案 (RESUME)
                      </>
                    ) : (
                      <>
                        <Play size={14} /> 启动新任务 (LAUNCH)
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}