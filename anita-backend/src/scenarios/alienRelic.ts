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
    currentRoom: 'camp_entrance',
    exploredRooms: ['camp_entrance'],
  },

  mapNodes: [
    { id: 'camp_entrance', name: '科考先遣营地', description: '遗迹外缘临时基地，维持弱引力锚定场', x: 20, y: 50, dangerLevel: 'safe' },
    { id: 'gravity_hall', name: '重力倒错回廊', description: '重力矢向周期性逆转，漂浮着未知几何多面体', x: 50, y: 25, dangerLevel: 'caution' },
    { id: 'fractal_chasm', name: '分形晶体断层', description: '超空间折叠裂隙，折射刺目的高维极光', x: 50, y: 75, dangerLevel: 'danger' },
    { id: 'hypercube_core', name: '超立方体圣殿', description: '超古代意识物理投影核心，空间曲率极度畸变', x: 80, y: 50, dangerLevel: 'danger' }
  ],
  mapEdges: [
    ['camp_entrance', 'gravity_hall'],
    ['camp_entrance', 'fractal_chasm'],
    ['gravity_hall', 'hypercube_core'],
    ['fractal_chasm', 'hypercube_core'],
    ['gravity_hall', 'fractal_chasm']
  ],

  arbiterRules: `
【高维异星空间法则】
1. 这里的重力与空间结构是折叠的，莽撞跳跃可能跌入折叠断层扣除巨额 HP，直视远古图腾扣除大量理智。
2. 同位素光棒能照亮折叠阴影；重力测绘仪可用于侦测前方是否发生空间塌陷。

【空间连通与移动裁决法则】
- 本遗迹包含 4 个空间节点：camp_entrance(先遣营地), gravity_hall(重力回廊), fractal_chasm(分形断层), hypercube_core(超立方圣殿)。
- 高维通道拓扑连通规则：
  * camp_entrance 连通 gravity_hall, fractal_chasm
  * gravity_hall 连通 camp_entrance, hypercube_core, fractal_chasm
  * fractal_chasm 连通 camp_entrance, hypercube_core, gravity_hall
  * hypercube_core 连通 gravity_hall, fractal_chasm
- 移动判定：当玩家意图前往相邻物理区域且通过重力测量时，在 newRoom 填入目标区域ID；未移动或因引力紊乱受阻时填 null。
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