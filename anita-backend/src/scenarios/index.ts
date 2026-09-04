import { ScenarioConfig } from './types';
import { deepspaceStation } from './deepspaceStation';
import { cyberDeadCity } from './cyberDeadCity';
import { alienRelic } from './alienRelic';

export const scenarios: ScenarioConfig[] = [
    deepspaceStation,
    cyberDeadCity,
    alienRelic,
    // 其他剧本可以在这里继续添加
];
//根据剧本 ID 获取对应的 ScenarioConfig
export const getScenario = (id?: string): ScenarioConfig => {
    if(!id)return deepspaceStation
    return scenarios.find(s=>s.id===id) || deepspaceStation;
};
// 获取供前端大厅展示的元数据列表（去除复杂的函数，只保留基本信息）
export function listScenarioMetas(){
    return scenarios.map(scenario=>({
        id: scenario.id,
        name: scenario.name,
        tagline: scenario.tagline,
        difficulty: scenario.difficulty,
        tags: scenario.tags,
        briefing: scenario.briefing,
        initialPlayerState: scenario.initialPlayerState,
    }))
}


