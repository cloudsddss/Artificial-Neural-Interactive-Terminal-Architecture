import { generateText, Output } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { ArbiterDecisionSchema, ArbiterDecision } from './schema';
import { PlayerState } from '../types/player';

export async function resolveAction(
  lastUserMsg: string,
  playerState: PlayerState,
  memoryContext: string,
  arbiterRules: string=''
): Promise<ArbiterDecision> {
  const systemPrompt = `
你是一个文字冒险游戏的【核心数值与物理规则裁判引擎】。
你的任务是根据玩家动作和当前环境，严格按照物理规律和生存游戏逻辑进行客观裁决。

【当前玩家状态】
- 生命值: ${playerState.hp}% | 理智值: ${playerState.sanity}% | 神经同步率: ${playerState.integration ?? 0}%
- 随身物品: ${(playerState.inventory ?? []).join(', ') || '空'}
- 环境威胁: ${(playerState.hazards ?? []).join(', ') || '无'}

【裁决准则】
1. 鲁莽行为惩罚：若在危险环境（如高压漏电、神经毒气）下进行危险动作，必须扣除 HP 或 SAN。
2. 物品真实性：玩家声称使用的物品必须在随身背包中。
3. 纯客观：你只需输出裁决数据，绝对不要输出任何第一人称台词。

${arbiterRules}
  `.trim();

  const { output } = await generateText({
    model: deepseek(process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'),
    output: Output.object({
      schema: ArbiterDecisionSchema,
    }),
    system: systemPrompt,
    prompt: lastUserMsg,
  });

  return output;
}
