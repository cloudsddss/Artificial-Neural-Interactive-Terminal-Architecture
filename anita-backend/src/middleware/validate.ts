import { Request, Response, NextFunction } from 'express';
import { ZodType, z } from 'zod'; // 👈 把 ZodSchema 换成 ZodType
/**
 * 🛡️ 请求体验证中间件工厂 (validateBody)
 * 作用：在路由执行前，对 req.body 进行强类型和边界校验。
 * - 校验通过：自动清洗数据，调用 next() 放行；
 * - 校验失败：捕获 ZodError 并通过 next(error) 自动转交给全局 errorHandler。
 */
export const validateBody = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // parseAsync 会验证所有字段，若非法直接抛出 ZodError
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      // 传递给 Express 错误拦截链
      next(error);
    }
  };
};

// ============================================================
// ★ 核心业务 Schema 规则定义 ★
// ============================================================

/**
 * 1. 登录认证请求规则 (POST /api/login)
 */
export const loginSchema = z.object({
  playerId: z
    .string({ message : '操作员代号为必填项。' })
    .trim()
    .min(1, '操作员代号不能为空。')
    .max(32, '操作员代号长度不能超过 32 个字符。')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, '操作员代号仅支持字母、数字、下划线及破折号。'),
});

/**
 * 2. 玩家状态结构规则
 */
export const playerStateSchema = z.object({
  hp: z.number({ message : '生命体征 (hp) 为必填项。' }).min(0, '生命值不能低于 0').max(100, '生命值不能高于 100'),
  sanity: z.number({ message : '神经稳态 (sanity) 为必填项。' }).min(0, '理智值不能低于 0').max(100, '理智值不能高于 100'),
  integration: z.number().min(0).max(100).optional().default(10),
  inventory: z.array(z.string()).default([]),
  hazards: z.array(z.string()).optional().default([]),
  clues: z.array(z.any()).optional().default([]),
  // 👇 新增下面两行：
  currentRoom: z.string().optional(),
  exploredRooms: z.array(z.string()).optional().default([]),
});

/**
 * 3. 存档保存请求规则 (POST /api/save)
 * 严格防范恶意篡改或损坏 MySQL JSON 字段
 */
export const saveSessionSchema = z.object({
  scenarioId: z.string().optional().default('deepspace_station_13'),
  playerState: playerStateSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system'], {
            message: '消息角色只能是 user、assistant 或 system。',
        }),
        content: z.string({ message : '消息内容不能为空。' }),
      })
    )
    .min(1, '存档必须至少包含一条通讯记录。'),
});