import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';



/**
 * 🛡️ 自定义业务异常基类 (AppError)
 * 业务代码中遇到逻辑错误时，直接 throw new AppError(400, 'CODE', '说明')
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public errorCode: string,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}


/**
 * 🛡️ 全局未捕获异常处理中间件
 * 必须包含 4 个参数 (err, req, res, next)，Express 才能将其识别为错误处理器
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. 如果响应头已经发送出去了（例如流式传输中途报错），委托给 Express 默认处理
  if (res.headersSent) {
    return next(err);
  }
  // 2. 识别业务异常 (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }
  // 3. 识别 Zod 数据校验失败异常
  if (err instanceof ZodError) {
    const issues = err.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`);
    res.status(400).json({
      error: 'VALIDATION_FAILED',
      message: '请求数据格式校验未通过，A.N.I.T.A. 拒绝处理。',
      details: issues
    });
    return;
  }
  // 4. 未知系统异常（数据库挂了、代码空指针等）
  // 🛡️ 使用带有该请求专属 TraceID 的 logger 记录完整堆栈
  const log = req.log || console;
  log.error({
    path: req.path,
    method: req.method,
    errorMessage: err.message,
    stack: err.stack
  }, '[CRITICAL SYSTEM ERROR] 触发安全熔断');
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'A.N.I.T.A. 神经主脑处理异常，已触发安全熔断保护。',
    traceId: req.id, // 👈 核心亮点：把 TraceID 发给客户端，出问题凭 ID 秒查日志！
  });
}
/**
 * 🛡️ 404 未知接口兜底中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'RESOURCE_NOT_FOUND',
    message: `请求的端点 [${req.method} ${req.path}] 不存在，请校准通信频道。`
  });
}