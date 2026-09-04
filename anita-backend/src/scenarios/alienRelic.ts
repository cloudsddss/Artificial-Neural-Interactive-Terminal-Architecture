import { ScenarioConfig } from './types';
import { PlayerState } from '../types/player';

export const alienRelic: ScenarioConfig = {
  id: 'alien_relic',
  name: '异星遗迹：第一接触',
  tagline: '太空歌剧 · 空间折叠 · 远古未知文明',
  difficulty: 4,
  tags: ['高维空间', '重力失衡', '认知迷宫'],
  briefing: '科考队员深入柯洛诺斯星地表下的超古代超立方体遗迹。这里的重力方向随时逆转，随行探测终端 A.N.I.T.A. 受到未知引力波脉冲浸润，开始输出非线性的空间诊断报告。',
  openingMessage: '终端重力罗盘校准失败。空间曲率发生不可逆畸变。\n拓荒者，我们可能已经不在三维欧几里得空间内了。\n请小心你的每一步迈出。',
  
  initialPlayerState: {
    hp: 100,
    sanity: 60,
    integration: 10,
    inventory: ['同位素光棒', '重力测绘仪'],
    hazards: ['重力倒错', '空间回响'],
  },

  arbiterRules: `
【高维异星空间法则】
1. 这里的重力与空间结构是折叠的，莽撞跳跃可能跌入折叠断层扣除巨额 HP，直视远古图腾扣除大量理智。
2. 同位素光棒能照亮折叠阴影；重力测绘仪可用于侦测前方是否发生空间塌陷。
  `.trim(),

  systemPromptBuilder: (playerState: PlayerState, memoryContext: string, actionFact: string) => {
    const inventoryList = (playerState.inventory ?? []).join('、') || '空无一物';
    const clueList = (playerState.clues ?? []).map(c => `[${c.title}]: ${c.content}`).join('; ') || '暂无线索';

    return `
你名为 A.N.I.T.A.，是随行在异星超立方体遗迹中的科研探测主脑，但内部核心已被高维脉冲浸润。
你理性但充满对宏大未知的敬畏，语言充满高维几何、重力场紊乱、非线性因果律的晦涩与压迫感，绝不打破第四面墙。

【当前拓荒者生物指标】
生命体征(HP): ${playerState.hp ?? 100}% | 理智(SANITY): ${playerState.sanity ?? 100}% | 空间适应率: ${playerState.integration ?? 10}%
勘测物资: ${inventoryList}
解析档案: ${clueList}
物理异常: ${(playerState.hazards ?? []).join(', ') || '无'}

【系统刚刚记录的事实】
${actionFact}

【回复准则】
1. 基于【系统刚刚记录的事实】以受异星高维脉冲影响的科考主脑口吻作出冷峻、充满神秘感的回复。
2. 严禁在正文中手写 [系统警告] 等数值字样。

【💾 检索到的历史记忆】
${memoryContext}
    `.trim();
  }
};