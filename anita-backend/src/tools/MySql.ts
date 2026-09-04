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
//自动建记忆表，若不存在则创建
export async function initDB() {
  //使用pool.query()方法执行SQL语句
  //CREATE TABLE IF NOT EXISTS表示如果表不存在则创建
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id VARCHAR(50) PRIMARY KEY,
      text TEXT NOT NULL,
      embedding JSON NOT NULL,
      timestamp BIGINT NOT NULL,
      player_id VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  try {
    // (player_id, timestamp) 联合索引：WHERE player_id=? + ORDER BY timestamp DESC 走索引
    await pool.query(
      `CREATE INDEX idx_memories_player_ts ON memories (player_id, timestamp)`
    );
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_KEYNAME') console.error('[建索引失败]:', e);   // 已存在则静默
  }
}
//自动建立用户信息表，若不存在则创建
/**
 * 初始化用户会话表
 * 表结构：
 * - id: 用户ID，字符串类型，主键
 * - state: 用户状态，JSON格式，存储用户的当前状态信息
 * - messages: 消息记录，JSON格式，存储用户的历史消息记录
 * - updated_at: 更新时间戳，自动更新为当前时间
 */
export async function initUserTable() {
  try {
    // 1. 自动检测表中是否存在 player_id 字段
    const [cols] = await pool.query<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM user_sessions LIKE 'player_id'`
    );
    // 如果表已存在但没有 player_id 字段，说明是旧表结构，自动删旧建新
    if (cols && cols.length === 0) {
      console.log('[数据库迁移] 检测到旧版本 user_sessions 表，正在自动重建为多剧本表结构...');
      await pool.query(`DROP TABLE user_sessions`);
    }
  } catch {
    // 表原本不存在时会抛异常，静默忽略即可
  }

  // 2. 创建全新的复合主键表
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
}




export default pool;