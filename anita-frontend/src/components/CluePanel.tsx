//线索面板组件,用于显示玩家已发现的所有线索
import type { Clue } from '../types/type'

//组件抛出
export default function CluePanel({ clues }: { clues: Clue[] }) {
    const length = (clues || []).length;
    return (
        <div className="border border-green-800 rounded p-4 bg-black/50 flex-1">
            <h2 className="text-xs uppercase text-green-700 mb-3">线索与档案图谱 ({length})</h2>
            {length === 0 ? (
                <div className="text-xs text-green-900">暂未破译任何机密档案...</div>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clues.map((c) => (
                        <div key={c.clueId} className="border border-green-900/60 p-2 rounded bg-green-950/20">
                            <div className="text-xs font-bold text-green-400">❖ {c.title}</div>
                            <div className="text-xs text-green-600 mt-1">{c.content}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}