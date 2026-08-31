/**
 * 这里放玩家会话相关的接口
 * 包括登录、登出、注册、获取玩家信息等接口
 */

import { Router, Request, Response } from 'express'
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import pool, { initUserTable } from '../tools/MySql';
import type { PlayerState } from '../types/player';

dotenv.config();
initUserTable(); // 初始化用户会话表，确保表存在

const userSessionRouter = Router();


/**
 * 读取玩家存档接口，没有则创建
 * 请求参数：
 * - playerId: 玩家ID，字符串类型
 * 响应参数：
 * - state: 玩家状态，JSON格式
 */
userSessionRouter.get('/load/:playerId', async (req: Request, res: Response) => {
    // 从请求参数中获取玩家ID
    const { playerId } = req.params;
    try {
        // 查询用户会话表，获取玩家状态
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT state, messages FROM user_sessions WHERE id = ?', [playerId]);
        if (rows && rows.length > 0) {
            res.json({ playerState: rows[0].state, messages: rows[0].messages });
        } else {
            //重写没有找到的定义，创建新玩家会话记录
            console.log(`[系统] 检测到新玩家 ${playerId}，正在初始化档案...`);
            const defaultState: PlayerState = {
                hp: 100,
                sanity: 80,
                integration: 10,
                // 在这里定义初始物品
                inventory: ['手电筒', '一级权限卡', '备用电池'],
                hazards: [],
                clues: []
            };

            const defaultMessages = [
                { role: 'assistant', content: `[后端初始化] 验证通过。操作员 [${playerId}] 档案已建立。\nA.N.I.T.A. 系统已上线。请表明你的意图。` }
            ];

            // (可选) 你甚至可以在这里直接执行 INSERT，把新账号先存入数据库
            await pool.query('INSERT INTO user_sessions (id, state, messages) VALUES (?, ?, ?)',
                [playerId, JSON.stringify(defaultState), JSON.stringify(defaultMessages)]);

            // 返回初始化的数据给前端，状态码设为 200 OK
            res.json({ playerState: defaultState, messages: defaultMessages });
        }
    } catch (error) {
        console.error('用户会话错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
})
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
        const { playerId, playerState, messages } = req.body;
        // 使用 ON DUPLICATE KEY UPDATE 实现“有则更新，无则新建”
        await pool.query(`
      INSERT INTO user_sessions (id, state, messages) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE state = VALUES(state), messages = VALUES(messages)
    `, [playerId, JSON.stringify(playerState), JSON.stringify(messages)]);

        res.json({ success: true });
    } catch (error) {
        console.error('保存存档失败:', error);
        res.status(500).json({ error: 'Database error' });
    }
})

export default userSessionRouter;