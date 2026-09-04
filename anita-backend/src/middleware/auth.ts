import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;// 从环境变量中获取 JWT 密钥

// 声明合并：为全局 Express Request 统一注入 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        playerId: string;
      };
    }
  }
}

// 扩展 Express Request 类型定义，使 req.user 拥有强类型
export interface AuthenticatedRequest extends Request {
  user?: {
    playerId: string;
  };
}

/**
 * 为操作员签发 JWT Token（有效期 7 天）
 */
export function generateToken(playerId: string): string {
  return jwt.sign({ playerId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * 接口鉴权守卫中间件
 * 校验请求头中的 Authorization: Bearer <token>
 */
export function authenticate(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction) : void {
        // 获取请求头中的 Authorization 字段
        const authHeader = req.headers['authorization'];
        // 检查是否存在 Bearer Token
        const token = authHeader && authHeader.split('Bearer ')?authHeader.split('Bearer ')[1] : null;
        if (!token) {
            res.status(401).json({
            error: 'UNAUTHORIZED_ACCESS',
            message: '未提供访问令牌，A.N.I.T.A. 神经防火墙已拒绝连接。',
            });
            return;
        }
        // 验证 JWT Token
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if(err||!decoded || typeof decoded === 'string' || !('playerId' in decoded)) {
                res.status(401).json({
                    error: 'INVALID_TOKEN',
                    message: '访问令牌无效或已过期，A.N.I.T.A. 神经防火墙已拒绝连接。',
                });
                return;
            }
            // 将解码后的用户信息附加到请求对象上
            req.user = {
                playerId: (decoded as { playerId: string }).playerId
            };
            next();
        });
}