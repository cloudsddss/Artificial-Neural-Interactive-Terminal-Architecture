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
    // 3. 初始化系统日志与安全审计表 (system_logs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trace_id VARCHAR(50) NOT NULL,
        player_id VARCHAR(50),
        method VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL,
        status_code INT NOT NULL,
        duration_ms INT NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trace (trace_id),
        INDEX idx_player (player_id),
        INDEX idx_status (status_code),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('[数据库] A.N.I.T.A. 数据表与索引校验完成，状态就绪。');
  } catch (error: any) {
    console.error('[数据库初始化失败]:', error.message);
  }
}
/**
 * 🛡️ 异步旁路日志落库函数 (Fire-and-Forget)
 * 作用：将关键审计事件与异常写入 MySQL，出现任何错误静默降级，绝不影响玩家正常业务
 */
export function logToDatabase(data: {
  traceId: string;
  playerId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorMessage?: string;
}): void {
  pool.query(
    `INSERT INTO system_logs (trace_id, player_id, method, path, status_code, duration_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.traceId,
      data.playerId || null,
      data.method,
      data.path,
      data.statusCode,
      data.durationMs,
      data.errorMessage || null,
    ]
  ).catch((err) => {
    // 降级兜底：仅在控制台输出，绝不抛出未捕获异常
    console.error('[日志持久化失败]:', err.message);
  });
}


export default pool;