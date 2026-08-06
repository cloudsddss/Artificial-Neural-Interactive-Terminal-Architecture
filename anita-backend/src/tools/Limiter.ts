import rateLimit from 'express-rate-limit';

// 聊天接口限流：每个 playerId 每分钟最多 10 次
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: 10,             // 每窗口最多 10 次
  // 用 playerId 作为限流 key（降级到 IP）
  keyGenerator: (req) => req.body?.playerId || req.ip || 'unknown',
  validate: false,
  message: { error: '请求过于频繁，请稍后再试。' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 全局限流：每 IP 每分钟 60 次（防止其他接口被刷）
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  validate: false,
  message: { error: 'Too many requests.' },
});