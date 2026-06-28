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
    await pool.query(
    `CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(50) PRIMARY KEY,
        state JSON NOT NULL,
        messages JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    );
}




export default pool;