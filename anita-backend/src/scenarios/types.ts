import { PlayerState } from '../types/player';


export type ScenarioConfig = {
    id:string;// 剧本唯一标识符,如 "deepspace_station_13"
    name:string;// 剧本名称
    tagline:string;// 剧本副标题或宣传语
    difficulty:1 | 2 | 3 | 4 | 5;// 剧本难度等级,如 1-5
    tags:string[];// 剧本标签列表,如 ["sci-fi", "horror"]
    briefing:string;// 任务简报或背景概述
    openingMessage:string;// 剧本开场白或引导信息
    initialPlayerState: {
        hp: number;        // 初始生命值，百分比 0-100
        sanity: number;    // 初始理智值，百分比 0-100
        integration: number;  // 初始神经同步率，百分比 0-100（与前端/数据库字段名一致）
        inventory: string[];  // 初始随身物品列表
        hazards: string[]; // 初始环境威胁列表，如 ["radiation", "biohazard"]
    };// 玩家初始状态配置

    //该剧本的主脑提示词构造函数
    systemPromptBuilder:(
        playerState: PlayerState,
        memoryContext: string,
        actionFact: string
    )=>string;// 返回主脑提示词字符串
    // 专属于该剧本的物理/裁决规则（供阶段一 Arbiter 参考）
    arbiterRules: string;
}