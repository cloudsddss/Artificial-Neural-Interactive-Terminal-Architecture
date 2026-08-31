//定义玩家状态类型,每个字段都是可选的
export type PlayerState = {
    hp?: number;        // 生命值，百分比 0-100
    sanity?: number;    // 理智值，百分比 0-100
    integration?: number;  // 神经同步率，百分比 0-100（与前端/数据库字段名一致）
    hazards?: string[]; // 当前环境威胁列表，如 ["radiation", "biohazard"]
    inventory?: string[];  // 随身物品列表
    clues?: Clue[];        // 已发现线索列表
}
export interface Clue {
    clueId: string;
    title: string;
    content: string;
    discoveredAt?: string;
}