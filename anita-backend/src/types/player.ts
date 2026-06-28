//定义玩家状态类型,每个字段都是可选的
export type PlayerState ={
    hp?: number;        // 生命值，百分比 0-100
    sanity?: number;    // 理智值，百分比 0-100
    syncRate?: number;  // 神经同步率，百分比 0-100
    hazards?: string[]; // 当前环境威胁列表，如 ["radiation", "biohazard"]
}