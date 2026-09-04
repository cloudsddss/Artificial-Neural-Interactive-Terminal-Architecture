//定义更新系统状态的工具
// 用 Zod 定义参数的类型和校验规则
import {z} from 'zod'


// 定义更新系统状态方法，接受玩家状态作为参数
export const updateSystemStateTool = {
  description: '【强制规则】当玩家状态数值发生变化时（受伤、治疗、精神打击、恢复、神经同步率变化、环境突变），必须调用此工具——正面变化同样必须。',
  // 定义参数的类型和校验规则
  inputSchema: z.object({
    hpChange: z.number().describe('生命值增减变化，负数为扣除，正数为恢复。无变化填 0。'),
    sanityChange: z.number().describe('理智值增减变化，负数为扣除，正数为恢复。无变化填 0。'),
    integrationChange: z.number().optional().describe('神经同步率增减变化，正数为提升，负数为下降。无变化填 0。'),
    newHazards: z.array(z.string()).describe('新增威胁。注意：必须是简短的中文名词！如 ["高压漏电"], ["神经毒气"], ["致死辐射"], ["精神污染"]'),
    systemLog: z.string().describe('系统隐藏日志，必须使用中文编写，描述发生的异常。'),
  }),
  // execute 方法的类型定义
  execute: async ({ hpChange, sanityChange, integrationChange, newHazards, systemLog }: {
    hpChange: number;
    sanityChange: number;
    integrationChange?: number;
    newHazards: string[];
    systemLog: string;
  }) => {
    // 这里做实际的业务逻辑
    console.log(`[A.N.I.T.A. TOOL EXECUTION]: ${systemLog}`);
    console.log(`  -> HP Delta: ${hpChange}, Sanity Delta: ${sanityChange}, Sync Delta: ${integrationChange ?? 0}`);
    // 返回值给 AI，AI 据此继续说话
    return {
      status: 'executed',
      appliedChanges: { hp: hpChange, sanity: sanityChange, integration: integrationChange ?? 0, hazards: newHazards },
    };
  },
};
