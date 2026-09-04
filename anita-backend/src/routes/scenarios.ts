import { Router, Request, Response } from 'express';
import { listScenarioMetas, getScenario } from '../scenarios';

const scenariosRouter  = Router();

// 获取所有剧本的元数据
scenariosRouter .get('/', (req: Request, res: Response) => {
    const scenarioMetas = listScenarioMetas();
    res.json(scenarioMetas);
});

// 根据剧本 ID 获取对应的 ScenarioConfig
scenariosRouter .get('/:id', (req: Request<{ id: string }>, res: Response) => {
    const scenarioId = req.params.id;
    const scenarioConfig = getScenario(scenarioId); 
    res.json(scenarioConfig);
});

export default scenariosRouter ;