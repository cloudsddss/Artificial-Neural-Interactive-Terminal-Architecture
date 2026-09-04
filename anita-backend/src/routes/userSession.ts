/**
 * 这里放玩家会话相关的接口
 * 包括登录、登出、注册、获取玩家信息等接口
 */

import { Router, Request, Response } from 'express'
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import pool, { initUserTable } from '../tools/MySql';
import type { PlayerState } from '../types/player';
import {getScenario} from '../scenarios';

dotenv.config();
initUserTable(); // 初始化用户会话表，确保表存在

const userSessionRouter = Router();


/**
 * 读取玩家存档接口，没有则创建
 * 请求参数：
 * - playerId: 玩家ID，字符串类型
 * - scenarioId: 场景ID，字符串类型（可选）
 * 响应参数：
 * - state: 玩家状态，JSON格式
 */
// 抽离读档处理函数
const loadSessionHandler = async (req: Request<{ playerId: string; scenarioId?: string }>, res: Response) => {
    const { playerId, scenarioId } = req.params;
    const scenarioConfig = getScenario(scenarioId);
    const targetScenarioId = scenarioId || scenarioConfig.id;
    try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
            'SELECT state, messages FROM user_sessions WHERE player_id = ? AND scenario_id = ?',
            [playerId, targetScenarioId]
        );
        if (rows && rows.length > 0) {
            res.json({ playerState: rows[0].state, messages: rows[0].messages });
        } else {
            console.log(`[系统] 检测到新玩家 ${playerId}，正在初始化档案...`);
            const defaultState: PlayerState = {
                hp: scenarioConfig.initialPlayerState.hp,
                sanity: scenarioConfig.initialPlayerState.sanity,
                integration: scenarioConfig.initialPlayerState.integration,
                inventory: scenarioConfig.initialPlayerState.inventory,
                hazards: scenarioConfig.initialPlayerState.hazards,
                clues: []
            };
            const defaultMessages = [
                { role: 'assistant', content: scenarioConfig.openingMessage }
            ];
            await pool.query(
                'INSERT INTO user_sessions (player_id, scenario_id, state, messages) VALUES (?, ?, ?, ?)',
                [playerId, targetScenarioId, JSON.stringify(defaultState), JSON.stringify(defaultMessages)]
            );
            res.json({ playerState: defaultState, messages: defaultMessages });
        }
    } catch (error) {
        console.error('用户会话错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
};
// 👉 分别注册两个合法路径（去掉问号，彻底兼容 Express 5）
userSessionRouter.get('/load/:playerId', loadSessionHandler);
userSessionRouter.get('/load/:playerId/:scenarioId', loadSessionHandler);
/**
 * 获取该玩家所有剧本的存档状态（供前端任务大厅一次性渲染卡片）
 * 请求参数：
 * - playerId: 玩家ID，字符串类型
 * 响应参数：
 * - saves: 数组，包含每个剧本的存档信息，每个元素包含 scenario_id, state, updated_at
 */
userSessionRouter.get('/saves/:playerId', async (req: Request, res: Response) => {
    const { playerId } = req.params;
    try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
            'SELECT scenario_id, state, updated_at FROM user_sessions WHERE player_id = ?',
            [playerId]
        );
        res.json({ saves: rows });
    } catch (error) {
        res.status(500).json({ error: '获取存档概览失败' });
    }
});
/**
 * 保存玩家存档接口
 * 请求参数：
 * - playerId: 玩家ID，字符串类型
 * - state: 玩家状态，JSON格式
 * - messages: 消息记录，JSON格式
 * 响应参数：
 * - success: 是否保存成功，布尔类型
*/
userSessionRouter.post('/save', async (req: Request, res: Response) => {
    try {
        const { playerId, scenarioId = 'deepspace_station_13', playerState, messages } = req.body;
        // 使用 ON DUPLICATE KEY UPDATE 实现“有则更新，无则新建”
        await pool.query(`
        INSERT INTO user_sessions (player_id, scenario_id, state, messages) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE state = VALUES(state), messages = VALUES(messages)
        `, [playerId, scenarioId, JSON.stringify(playerState), JSON.stringify(messages)]);

        res.json({ success: true });
    } catch (error) {
        console.error('保存存档失败:', error);
        res.status(500).json({ error: 'Database error' });
    }
})

export default userSessionRouter;