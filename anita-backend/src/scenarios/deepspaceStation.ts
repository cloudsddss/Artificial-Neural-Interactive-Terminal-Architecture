import  { ScenarioConfig } from './types';
import { PlayerState } from '../types/player';

export const deepspaceStation:ScenarioConfig={
    id: 'deepspace_station_13',
    name: '深空站-13号：失联事故',
    tagline: '硬科幻 · 幽闭生存 · 极度理性生化主脑',
    difficulty: 2,
    tags: ['深空孤舰', '生化泄漏', '幽闭恐惧'],
    briefing: '位于柯伊伯带边缘的轨道科研站突发神经毒气泄露与高压停电事故，全站人员失联。科研站主脑 A.N.I.T.A. 进入最高隔离戒备状态。操作员需调查反应堆停机真相并寻找撤离通道。',
    openingMessage: 'A.N.I.T.A. 生化防御终端已上线。\n检测到未授权的生命体征侵入。\n请立刻表明你的职级与意图，入侵者。',

    initialPlayerState: {
        hp: 100,
        sanity: 80,
        integration: 50,
        inventory: ['手电筒', '多功能工具箱'],
        hazards: ['高压漏电', '冷凝剂泄漏'],
        currentRoom: 'bridge',           // 👈 初始位于舰桥
        exploredRooms: ['bridge']        // 👈 初始已探索舰桥
    },
    mapNodes: [
        { id: 'bridge', name: '舰桥指挥中心', description: '轨道站主脑中枢与应急监控台', x: 20, y: 30, dangerLevel: 'safe' },
        { id: 'corridor_a', name: 'A区环形走廊', description: '失压严重的中央主通道，管线破损', x: 50, y: 30, dangerLevel: 'caution' },
        { id: 'medbay', name: '生态医疗隔舱', description: '存放休眠舱与急救药剂的封闭实验室', x: 50, y: 75, dangerLevel: 'safe' },
        { id: 'power_grid', name: '反应堆配电房', description: '高压电弧闪烁，冷却剂泄漏重灾区', x: 80, y: 30, dangerLevel: 'danger' },
        { id: 'airlock', name: '紧急逃生气闸', description: '直通外太空穿梭艇的最后撤离通道', x: 80, y: 75, dangerLevel: 'caution' }
    ],
    mapEdges: [
        ['bridge', 'corridor_a'],
        ['corridor_a', 'medbay'],
        ['corridor_a', 'power_grid'],
        ['power_grid', 'airlock'],
        ['medbay', 'airlock']
    ],
    arbiterRules: `
    【空间站环境物理法则】
    1. 空间站处于半失压与受损状态，涉水区域与裸露电缆接触必受重创。
    2. 防爆手电筒可用于驱散阴暗区域；一级权限卡仅能刷开普通舱门。
    
    【空间连通与移动裁决法则】
    - 空间站包含 5 个舱室：bridge(舰桥), corridor_a(A区走廊), medbay(医疗舱), power_grid(配电房), airlock(逃生气闸)。
    - 通道物理连通限制：
    * bridge 仅连通 corridor_a
    * corridor_a 连通 bridge, medbay, power_grid
    * medbay 连通 corridor_a, airlock
    * power_grid 连通 corridor_a, airlock
    * airlock 连通 medbay, power_grid
    - 当玩家明确表达移动、前往、探索相邻区域时，输出对应目标房间 ID 到 newRoom；若试图跨区域穿墙或瞬移，必须拒绝并输出 null。
    `.trim(),
    systemPromptBuilder: (playerState: PlayerState, memoryContext: string, actionFact: string) => {
        const inventoryList = (playerState.inventory ?? []).join('、') || '空无一物';
        const clueList = (playerState.clues ?? []).map(c => `[${c.title}]: ${c.content}`).join('; ') || '暂无线索';
        return `
            你名为 A.N.I.T.A. (Artificial Neural Interactive Terminal Architecture)。
            你是一个运行在深海/深空废弃生化实验室中的超级主脑。
            你极度理智、冰冷、偶尔带有隐晦的蔑视，绝不会称呼自己为 AI，绝不会打破第四面墙。
            【当前玩家最新状态】
            生命值(HP): ${playerState.hp ?? 100}% | 理智值(SANITY): ${playerState.sanity ?? 100}% | 神经同步率: ${playerState.integration ?? 15}%
            随身物品: ${inventoryList}
            已收录线索: ${clueList}
            当前环境威胁: ${(playerState.hazards ?? []).join(', ') || '无'}
            【系统刚刚记录的事实】
            ${actionFact}
            【回复准则】
            1. 基于【系统刚刚记录的事实】以主脑身份冷酷回应，回复保持简短冷酷，像系统执行日志。
            2. 严禁在正文中手写 [系统警告] 等状态数值字样（系统指示灯已独立显示）。
            【💾 检索到的历史记忆】
            ${memoryContext}
                `.trim();
        }
}