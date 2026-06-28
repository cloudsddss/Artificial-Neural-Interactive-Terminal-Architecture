import { Biohazard } from 'lucide-react'

//定义威胁描述的字符串数组类型
interface HazardPanelProps {
  hazards: string[];
}
//定义组件的渲染逻辑
export default function HazardPanel({ hazards }: HazardPanelProps) {
    // 检查是否有威胁
    const hasHazards = hazards.length > 0
    return (
        <>
        <div className="border border-red-900/50 rounded p-4 bg-black/50 flex-1 relative overflow-hidden">
            {hasHazards&&(
                <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none" />
            )}
            {/* 标题 */}
            <h2 className="text-xs uppercase text-red-700 mb-4 flex items-center gap-2">
                <Biohazard size={16} /> 环境威胁
            </h2>
            <ul className="text-sm space-y-2 text-red-500 font-bold">
                {
                    hasHazards?(
                        hazards.map((hazard, index) => (
                            <li key={index} className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                {hazard}
                            </li>
                        ))
                    ):(
                        // 无威胁时的占位文字
                        <li className="text-green-800/50 font-normal">当前区域未检测到异常</li>
                    )
                }
            </ul>
        </div>
        </>
    )

}
