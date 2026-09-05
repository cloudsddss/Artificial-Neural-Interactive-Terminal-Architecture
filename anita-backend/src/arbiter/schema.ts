import { z } from 'zod';

export const ArbiterDecisionSchema = z.object({
  actionAnalysis: z.string().describe('分析玩家行为是否符合物理/常理逻辑及后果'),
  hpChange: z.number().describe('生命值增减，负为扣除，正为恢复，无变化填 0'),
  sanityChange: z.number().describe('理智值增减，负为扣除，正为恢复，无变化填 0'),
  integrationChange: z.number().describe('神经同步率增减，无变化填 0'),
  newHazards: z.array(z.string()).describe('新增环境威胁名词列表，如 ["强酸飞溅"]'),
  itemToUse: z.object({
    item: z.string().describe('使用的物品名称'),
    target: z.string().describe('目标对象'),
    actionResult: z.string().describe('动作执行后的物理结果'),
  }).nullable().describe('若玩家明确使用背包物品填入对象，否则填 null'),
  clueDiscovered: z.object({
    clueId: z.string(),
    title: z.string(),
    content: z.string(),
  }).nullable().describe('若发现关键密码/档案填入对象，否则填 null'),
  newRoom: z.string().nullable().describe('若玩家成功移动到新的舱段/房间，填入目标舱段ID（如 "medbay"、"reactor" 等）；未移动或被门禁阻挡填 null'),
  factForNarrator: z.string().describe('一句话总结刚刚发生的客观事实，供主脑生成台词'),
  systemLog: z.string().describe('系统隐藏日志'),
});

export type ArbiterDecision = z.infer<typeof ArbiterDecisionSchema>;