import { useMemo } from 'react';
import { Compass, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { MapNode, MapEdge } from '../types/type';

interface TacticalMapPanelProps {
  nodes?: MapNode[];
  edges?: MapEdge[];
  currentRoom?: string;
  exploredRooms?: string[];
}

export default function TacticalMapPanel({
  nodes = [],
  edges = [],
  currentRoom,
  exploredRooms = [],
}: TacticalMapPanelProps) {
  // 已探索集合与当前节点
  const exploredSet = useMemo(() => new Set(exploredRooms.length > 0 ? exploredRooms : [currentRoom || '']), [exploredRooms, currentRoom]);
  const currentNode = useMemo(() => nodes.find(n => n.id === currentRoom), [nodes, currentRoom]);

  // 计算与已探索区域直接连通的“相邻未知节点”（迷雾边缘探知）
  const adjacentSet = useMemo(() => {
    const adj = new Set<string>();
    edges.forEach(([from, to]) => {
      if (exploredSet.has(from) && !exploredSet.has(to)) adj.add(to);
      if (exploredSet.has(to) && !exploredSet.has(from)) adj.add(from);
    });
    return adj;
  }, [edges, exploredSet]);

  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="border border-green-800/80 bg-black/80 rounded p-3 font-mono text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.08)]">
      {/* 头部 HUD */}
      <div className="flex items-center justify-between border-b border-green-900/60 pb-2 mb-2 text-xs">
        <span className="flex items-center gap-1.5 font-bold tracking-wider text-green-300">
          <Compass size={14} className="text-green-400 animate-spin-slow" />
          战术拓扑雷达 (TACTICAL MAP)
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-950/60 border border-green-800 flex items-center gap-1">
          {currentNode?.dangerLevel === 'danger' ? (
            <><ShieldAlert size={10} className="text-red-400" /><span className="text-red-400">高危</span></>
          ) : (
            <><ShieldCheck size={10} className="text-green-400" /><span className="text-green-400">正常</span></>
          )}
        </span>
      </div>

      {/* 当前舱段提示 */}
      <div className="text-[11px] text-green-500 mb-2 truncate">
        定位: <strong className="text-green-300">{currentNode?.name || '未知区域'}</strong>
        <span className="text-zinc-500 text-[10px] ml-1">({currentNode?.description || '暂无数据'})</span>
      </div>

      {/* 原生 SVG 拓扑雷达视口 */}
      <div className="relative w-full aspect-[4/3] bg-zinc-950/90 rounded border border-green-950 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full p-2 select-none">
          {/* 雷达背景同心圆与十字刻度 */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#052e16" strokeWidth="0.5" strokeDasharray="2,2" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#052e16" strokeWidth="0.5" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="#052e16" strokeWidth="0.4" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="#052e16" strokeWidth="0.4" />

          {/* 通道连线 */}
          {edges.map(([fromId, toId], idx) => {
            const from = nodes.find(n => n.id === fromId);
            const to = nodes.find(n => n.id === toId);
            if (!from || !to) return null;

            const bothExplored = exploredSet.has(fromId) && exploredSet.has(toId);
            const oneExplored = (exploredSet.has(fromId) && adjacentSet.has(toId)) || (exploredSet.has(toId) && adjacentSet.has(fromId));

            if (!bothExplored && !oneExplored) return null; // 迷雾深处不连线

            return (
              <line
                key={`edge-${idx}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={bothExplored ? '#16a34a' : '#065f46'}
                strokeWidth={bothExplored ? '1.2' : '0.8'}
                strokeDasharray={bothExplored ? undefined : '2,2'}
              />
            );
          })}

          {/* 舱段节点 */}
          {nodes.map(node => {
            const isCurrent = node.id === currentRoom;
            const isExplored = exploredSet.has(node.id);
            const isAdjacent = adjacentSet.has(node.id);

            // 未探索且不相邻 → 战争迷雾完全遮蔽
            if (!isExplored && !isAdjacent) return null;

            return (
              <g key={node.id}>
                {/* 当前房间脉冲外环 */}
                {isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="5.5"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="0.8"
                    className="animate-ping"
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}

                {/* 节点核心圆点 */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isCurrent ? '3' : '2.2'}
                  fill={isCurrent ? '#22c55e' : isExplored ? '#064e3b' : '#09090b'}
                  stroke={isCurrent ? '#bbf7d0' : isExplored ? '#10b981' : '#047857'}
                  strokeWidth={isCurrent ? '1.2' : '0.8'}
                  strokeDasharray={isAdjacent ? '1,1' : undefined}
                />
                {/* 节点文字标注 */}
                <text
                  x={node.x}
                  y={node.y + (node.y > 60 ? -7 : 8)}
                  textAnchor="middle"
                  fontSize={isCurrent ? '4.8' : '4.0'}
                  fill={isCurrent ? '#4ade80' : isExplored ? '#86efac' : '#a7f3d0'}
                  fontWeight={isCurrent ? 'bold' : '600'}
                  stroke="#000000"
                  strokeWidth="1.6"
                  paintOrder="stroke fill"
                  strokeLinejoin="round"
                >
                  {isExplored ? node.name : '? 未知区域'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}