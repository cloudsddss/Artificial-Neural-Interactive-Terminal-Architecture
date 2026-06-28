// --- 聊天消息 ---
export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// --- 玩家状态 ---
export type PlayerState = {
  hp: number;
  sanity: number;
  integration: number;
  inventory: string[];
  hazards: string[];          // 环境威胁列表，只增不减
};

// 新增 保存数据类型，保存游戏进度
export type SaveData = {
  playerId: string;
  playerState: PlayerState;
  messages: Message[];
};



// --- 后端工具调用参数（协议中 9: 开头的报文） ---
export type ToolCallPayload = {
  toolName: string;
  args: {
    hpChange: number;        // 生命值变化，负=扣血，正=回血
    sanityChange: number;    // 理智值变化
    systemLog: string;       // 隐藏彩蛋，仅 console.warn 输出
    newHazards: string[];    // 新增威胁，合并去重写入 hazards
    reason?: string;          // 变化缘由（旧版用，新版改用分行显示）
  };
};
