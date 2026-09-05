/***
 * MySql工具类
 * 包括数据库连接池、自动建表
 * 依赖mysql2和@xenova/transformers库
 * 适用于Anita的记忆系统模块
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

//建立MySql连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'anita_db',
  waitForConnections: true,// 等待连接
  connectionLimit: 10,// 连接限制
  queueLimit: 0
});
/**
 * 自动初始化数据库所有业务表与索引
 */
export async function initDB() {
  try {
    // 1. 初始化记忆表（含联合索引）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id VARCHAR(50) PRIMARY KEY,
        text TEXT NOT NULL,
        embedding JSON NOT NULL,
        timestamp BIGINT NOT NULL,
        player_id VARCHAR(50) NOT NULL,
        INDEX idx_memories_player_ts (player_id, timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. 初始化用户会话表（含复合主键与索引）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        player_id VARCHAR(50) NOT NULL,
        scenario_id VARCHAR(50) NOT NULL,
        state JSON NOT NULL,
        messages JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, scenario_id),
        INDEX idx_player (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('[数据库] A.N.I.T.A. 数据表与索引校验完成，状态就绪。');
  } catch (error: any) {
    console.error('[数据库初始化失败]:', error.message);
  }
}



export default pool;