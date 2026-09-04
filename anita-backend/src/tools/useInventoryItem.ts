//定义使用背包物品的工具
// 用 Zod 定义参数的类型和校验规则
import { z } from 'zod'

// 定义使用背包物品方法，接受玩家状态作为参数
export const useInventoryItemTool = {
  description: '【强制规则】当玩家在终端尝试使用、消耗或装配背包中的物品（如使用门禁卡、注射血清、装填电池）时，必须调用此工具。',
  inputSchema: z.object({
    item: z.string().describe('使用的物品名称，必须与玩家随身物品列表中的名称严格一致。'),
    target: z.string().describe('物品的目标对象或交互位置（例如："一级刷卡机"、"备用电源插槽"）。'),
    actionResult: z.string().describe('执行动作后的系统日志描述，说明产生的影响。'),
  }),
  execute: async ({ item, target, actionResult }: {
    item: string;
    target: string;
    actionResult: string;
  }) => {
    console.log(`[A.N.I.T.A. ITEM USED]: 物品 [${item}] 作用于 [${target}] -> ${actionResult}`);
    return {
      status: 'executed',
      appliedChanges: { item, target, actionResult },
    };
  },
};