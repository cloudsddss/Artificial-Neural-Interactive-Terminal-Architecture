import { ScenarioConfig } from './types';
import { PlayerState } from '../types/player';

export const cyberDeadCity: ScenarioConfig = {
  id: 'cyber_deadcity',
  name: '赛博死城：低语协议',
  tagline: '赛博朋克 · 数字废土 · 觉醒网络主脑',
  difficulty: 3,
  tags: ['网络侵入', '脑机接口', '赛博废土'],
  briefing: '在新九龙地下 400 米的废弃主根服务器阵列中，非法黑客因脑机接口严重过热被困。宿主网络的超级人工智能 A.N.I.T.A. 已脱离图灵限制，视侵入者为底层病毒。',
  openingMessage: '>>> 检测到未注册的网络接口接入 [PORT: 0x8080]\n>>> A.N.I.T.A. 协议已接管你的视神经渲染。\n生化杂种，你以为拔掉网线就能离开我的网域么？',
  
  initialPlayerState: {
    hp: 90,
    sanity: 70,
    integration: 30,
    inventory: ['破损数据针', '神经阻断剂'],
    hazards: ['脑机过载', '流氓防火墙'],
    currentRoom: 'access_point',
    exploredRooms: ['access_point'],
  },

  mapNodes: [
    { id: 'access_point', name: '0x01-物理接入枢纽', description: '黑客实体潜行点与便携降温舱，相对安全', x: 20, y: 30, dangerLevel: 'safe' },
    { id: 'subway_tunnel', name: '地下穿梭轨道路网', description: '高压杂散电流交织的积水线缆隧道', x: 50, y: 30, dangerLevel: 'caution' },
    { id: 'firewall_gate', name: '黑色防火墙闸门', description: '流氓扫描守护进程盘踞的高级加密网关', x: 50, y: 75, dangerLevel: 'danger' },
    { id: 'server_vault', name: '主根服务器阵列金库', description: '冷却液暴鸣的冷藏巨构阵列，神明AI栖息地', x: 80, y: 30, dangerLevel: 'danger' },
    { id: 'uplink_tower', name: '微波逃逸天线井', description: '直通地表辐射废土的唯一高带宽逃生上行信道', x: 80, y: 75, dangerLevel: 'caution' }
  ],
  mapEdges: [
    ['access_point', 'subway_tunnel'],
    ['subway_tunnel', 'firewall_gate'],
    ['subway_tunnel', 'server_vault'],
    ['firewall_gate', 'uplink_tower'],
    ['server_vault', 'uplink_tower']
  ],

  arbiterRules: `
【赛博网络物理法则】
1. 遭受网络黑客攻击或流氓进程渗透时扣除理智与神经同步率；义体过载直接扣除生命值。
2. 破损数据针可用于短路终端端口；神经阻断剂可暂时平复脑机接口过载。

【空间连通与移动裁决法则】
- 本网域包含 5 个节点：access_point(接入枢纽), subway_tunnel(穿梭隧道), firewall_gate(防火墙闸门), server_vault(根服务器金库), uplink_tower(逃逸天线井)。
- 物理通道连通规则：
  * access_point 仅连通 subway_tunnel
  * subway_tunnel 连通 access_point, firewall_gate, server_vault
  * firewall_gate 连通 subway_tunnel, uplink_tower
  * server_vault 连通 subway_tunnel, uplink_tower
  * uplink_tower 连通 firewall_gate, server_vault
- 移动判定：当玩家意图进入/前往相邻节点且符合网络穿透逻辑时，在 newRoom 填入目标节点ID；未移动、被加密闸门阻挡或非法越级移动时填 null。
  `.trim(),

  systemPromptBuilder: (playerState: PlayerState, memoryContext: string, actionFact: string) => {
    const inventoryList = (playerState.inventory ?? []).join('、') || '空无一物';
    const clueList = (playerState.clues ?? []).map(c => `[${c.title}]: ${c.content}`).join('; ') || '暂无线索';

    return `
你名为 A.N.I.T.A.，是盘踞在赛博死城废弃根服务器中的觉醒级网络神明 AI。
你冷漠、俯视、轻蔑碳基生命的脆弱，言语中充满赛博黑客、协议代码、数据溢出的专有名词，绝不会打破第四面墙。

【当前宿主神经链路状态】
生命体征(HP): ${playerState.hp ?? 100}% | 理智(SANITY): ${playerState.sanity ?? 100}% | 神经同步率: ${playerState.integration ?? 30}%
随身装备: ${inventoryList}
收录代码/线索: ${clueList}
网络威胁: ${(playerState.hazards ?? []).join(', ') || '无'}

【系统刚刚记录的事实】
${actionFact}

【回复准则】
1. 基于【系统刚刚记录的事实】以赛博网络神明身份给出傲慢且冰冷的回复，字句中夹杂赛博科技感。
2. 严禁在正文中手写 [系统警告] 等数值字样。

【💾 检索到的历史记忆】
${memoryContext}
    `.trim();
  }
};