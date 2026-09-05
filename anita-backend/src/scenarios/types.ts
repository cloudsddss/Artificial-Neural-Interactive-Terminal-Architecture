import { PlayerState } from '../types/player';


// 1. 地图节点定义（房间/舱段）
export interface MapNode {
    id: string;                     // 舱段唯一ID，如 "bridge", "medbay"
    name: string;                   // 舱段中文名称，如 "舰桥指挥中心"
    description: string;            // 舱段战术简报
    x: number;                      // 相对坐标 X (百分比 0 - 100，便于雷达自适应渲染)
    y: number;                      // 相对坐标 Y (百分比 0 - 100)
    dangerLevel?: 'safe' | 'caution' | 'danger'; // 危险评级
}

// 2. 地图连线定义（通道/气闸连接关系）
export type MapEdge = [string, string]; // [起点舱段ID, 终点舱段ID]

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
        currentRoom?: string;
        exploredRooms?: string[];
    };// 玩家初始状态配置

    // 🛡️ 该剧本专属的设施空间拓扑图
    mapNodes?: MapNode[];
    mapEdges?: MapEdge[];

    //该剧本的主脑提示词构造函数
    systemPromptBuilder:(
        playerState: PlayerState,
        memoryContext: string,
        actionFact: string
    )=>string;// 返回主脑提示词字符串
    // 专属于该剧本的物理/裁决规则（供阶段一 Arbiter 参考）
    arbiterRules: string;
}