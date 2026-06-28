import { Activity, Heart, Brain, ShieldAlert } from 'lucide-react';
import type { PlayerState } from '../types/type';

type StatusPanelProps = {
  playerState: PlayerState;
  isTakingDamage: boolean; // 受击时边框变红 + 外发光
};

// ============================================================
// 内部子组件：单条进度条
// 结构相同，通过 props 区分图标、颜色、警告阈值
// ============================================================
function StatBar({ icon, label, value, barColor, warningColor, warningThreshold }: {
  icon: React.ReactNode;       // lucide 图标节点
  label: string;               // 标签文字
  value: number;               // 当前值 0-100
  barColor: string;            // 正常状态 Tailwind 颜色类名
  warningColor?: string;       // 警告状态颜色（可选）
  warningThreshold?: number;   // 警告阈值（可选，不传则永不警告）
}) {
  // 只有主动传了阈值且当前值低于阈值时才启用警告
  const isWarning = warningThreshold !== undefined && value < warningThreshold;

  return (
    <div>
      {/* 标签行：左侧图标+文字，右侧数值百分比 */}
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-1">
          {icon} {label}
        </span>
        <span className={isWarning ? 'text-red-500' : ''}>{value}%</span>
      </div>
      {/* 进度条：外层轨道 + 内层填充 */}
      <div className="h-2 w-full bg-green-900/30 rounded overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isWarning ? (warningColor ?? barColor) : barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// 主组件：生命体征面板
// 右侧上半部分，包含 HP / Sanity / 神经同步率 三组进度条
// ============================================================
export default function StatusPanel({ playerState, isTakingDamage }: StatusPanelProps) {
  return (
    // 受击时边框变红 + 红色外发光（30px 半径，80% 不透明度）
    <div className={`border rounded p-4 bg-black/50 transition-all
      ${isTakingDamage ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]' : 'border-green-800'}`}>

      <h2 className="text-xs uppercase text-green-700 mb-4 flex items-center gap-2">
        <Activity size={16} /> 生理体征监控
      </h2>

      <div className="space-y-4">
        {/* HP：低于 30 时图标变红弹跳 + 进度条变红 */}
        <StatBar
          icon={<Heart size={14} className={playerState.hp < 30 ? 'text-red-500 animate-bounce' : ''} />}
          label="HP (生命体征)"
          value={playerState.hp}
          barColor="bg-green-500"
          warningColor="bg-red-500"
          warningThreshold={30}
        />
        {/* SANITY：紫色进度条，无警告阈值 */}
        <StatBar
          icon={<Brain size={14} />}
          label="SANITY (理智值)"
          value={playerState.sanity}
          barColor="bg-purple-500"
        />
        {/* 神经同步率：蓝色进度条，无警告阈值 */}
        <StatBar
          icon={<ShieldAlert size={14} />}
          label="神经同步率"
          value={playerState.integration}
          barColor="bg-blue-500"
        />
        
      </div>
    </div>
  );
}
