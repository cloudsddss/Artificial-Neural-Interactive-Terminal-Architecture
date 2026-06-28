// 第1-3行：Props 类型定义
interface InventoryPanelProps {
  inventory: string[];   // 物品名称数组，来自 playerState.inventory
}

export default function InventoryPanel({ inventory }: InventoryPanelProps) {
  return (
  <>
    {/*外层容器：绿色边框 + 半透明黑底 + flex-1 撑满剩余高度*/}
    <div className="border border-green-800 rounded p-4 bg-black/50 flex-1">
      {/*标题：小号大写灰色文字*/}
      <h2 className="text-xs uppercase text-green-700 mb-4">随身物品库</h2>
      {/*物品列表*/}
      <ul className="text-sm space-y-2 text-green-600">
        {/*每个物品用方括号包裹：[ 手电筒 ]*/}
        {inventory.map((item, idx) => (
          <li key={idx}>[ {item} ]</li>
        ))}
      </ul>
    </div>
    </>
  );
}
