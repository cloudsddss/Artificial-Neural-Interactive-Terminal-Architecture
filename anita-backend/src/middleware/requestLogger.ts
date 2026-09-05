import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../tools/logger';
import { logToDatabase } from '../tools/MySql'; // 👈 引入数据库日志记录器

// 扩展 Express Request 类型定义，注入唯一链路 ID (id) 与请求专属子 logger (log)
declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: typeof logger;
    }
  }
}

/**
 * 🛡️ 请求生命周期与 TraceID 链路追踪中间件
 * 职责：
 * 1. 为每个请求分配唯一的 TraceID，并回传给前端响应头 x-request-id；
 * 2. 统计每个请求的精确耗时（ms）；
 * 3. 按照状态码（2xx/4xx/5xx）输出结构化格式日志。
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // 1. 生成全局唯一链路 ID (优先继承前端传入的 x-request-id，便于全链路打通)
  const traceId = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = traceId;
  res.setHeader('x-request-id', traceId);
  // 2. 为当前请求绑定携带 TraceID 的专属子 logger
  const reqLog = logger.child({ traceId });
  req.log = reqLog;
  const startTime = Date.now();
  // 3. 记录请求到达
  reqLog.info({ method: req.method, url: req.url, ip: req.ip }, `[REQ] ${req.method} ${req.url}`);
  // 4. 监听响应完成事件，计算耗时并输出结果
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const msg = `[RES] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`;

    if (res.statusCode >= 500) {
      reqLog.error({ statusCode: res.statusCode, duration: `${duration}ms` }, msg);
    } else if (res.statusCode >= 400) {
      reqLog.warn({ statusCode: res.statusCode, duration: `${duration}ms` }, msg);
    } else {
      reqLog.info({ statusCode: res.statusCode, duration: `${duration}ms` }, msg);
    }

    // 🛡️ 智能持久化策略：
    // 1. 所有异常请求 (状态码 >= 400：越权403、未授权401、校验失败400、系统崩溃500)
    // 2. 关键安全审计事件 (登录成功、存档保存成功)
    const isError = res.statusCode >= 400;
    const isAuditAction = (req.path === '/api/login' || req.path === '/api/save') && res.statusCode === 200;

    if (isError || isAuditAction) {
      const activePlayerId = req.user?.playerId || (req.body && req.body.playerId);
      logToDatabase({
        traceId,
        playerId: activePlayerId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });
  next();
}