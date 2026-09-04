// --- 聊天消息 ---
export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// --- 玩家状态 ---
export type Clue = {
  clueId: string;
  title: string;
  content: string;
  discoveredAt?: string;
};
export type PlayerState = {
  hp: number;
  sanity: number;
  integration: number;
  inventory: string[];
  hazards: string[];
  clues?: Clue[]; // 新增线索列表
};


// 新增 保存数据类型，保存游戏进度
export type SaveData = {
  playerId: string;
  playerState: PlayerState;
  messages: Message[];
};



// --- 后端工具调用参数（协议中 9: 开头的报文） ---
export type ToolCallPayload =
{
  toolName: 'updateSystemState';
  args: {
    hpChange: number;        // 生命值变化，负=扣血，正=回血
    sanityChange: number;    // 理智值变化
    systemLog: string;       // 隐藏彩蛋，仅 console.warn 输出
    newHazards: string[];    // 新增威胁，合并去重写入 hazards
  };
}
| {
  toolName: 'useInventoryItem';
  args: {
    item: string;
    target: string;
    actionResult: string;
  };
}
| {
  toolName: 'discoverClue';
  args: {
    clueId: string;
    title: string;
    content: string;
  };
};
// 1. 剧本元数据（供大厅展示卡片）
export type ScenarioMeta = {
  id: string;
  name: string;
  tagline: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  briefing: string;
  initialPlayerState: PlayerState;
};

// 2. 玩家在各个剧本的存档概览
export type ScenarioSaveInfo = {
  scenario_id: string;
  state: PlayerState;
  updated_at: string;
};
