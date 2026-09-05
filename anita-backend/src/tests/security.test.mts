import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server';

// 🛡️ Mock 数据库模块，确保即使本地没有跑 MySQL，测试套件也能 100% 独立高速运行
vi.mock('../tools/MySql', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[]]),
  },
  initDB: vi.fn(), // 👈 统一 Mock initDB
}));

describe('A.N.I.T.A. 神经系统安全与接口自动化测试', () => {
  let authToken = '';
  const testPlayerId = 'AGENT_TESTER';

  // 1. 测试 404 兜底拦截
  it('GET /api/unknown_endpoint - 未知端点应返回 404 结构化 JSON', async () => {
    const res = await request(app).get('/api/unknown_endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RESOURCE_NOT_FOUND');
  });

  // 2. 测试登录与 JWT 令牌签发
  describe('POST /api/login (身份鉴权与令牌签发)', () => {
    it('合法代号应成功登录并签发有效 JWT Token', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ playerId: testPlayerId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.playerId).toBe(testPlayerId);

      authToken = res.body.token; // 保存签发的 Token 供后续测试使用
    });

    it('空代号应被 Zod 拦截并返回 400', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ playerId: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_FAILED');
    });

    it('包含非法注入字符的代号应被拒绝 400', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ playerId: 'BAD<AGENT>DROP TABLE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_FAILED');
    });
  });

  // 3. 测试 JWT 神经防火墙 (401 Unauthorized)
  describe('JWT 身份防火墙拦截 (401 Unauthorized)', () => {
    it('未携带 Token 访问受保护接口 (/api/save) 应被拒绝 401', async () => {
      const res = await request(app)
        .post('/api/save')
        .send({
          scenarioId: 'deepspace_station_13',
          playerState: { hp: 100, sanity: 80, inventory: [] },
          messages: [{ role: 'assistant', content: 'test' }],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED_ACCESS');
    });

    it('携带伪造/篡改的 Token 应被拦截 401', async () => {
      const res = await request(app)
        .post('/api/save')
        .set('Authorization', 'Bearer forged.fake.token')
        .send({
          scenarioId: 'deepspace_station_13',
          playerState: { hp: 100, sanity: 80, inventory: [] },
          messages: [{ role: 'assistant', content: 'test' }],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });
  });

  // 4. 测试 IDOR 越权攻击防护 (403 Forbidden)
  describe('防越权安全检测 (403 Forbidden)', () => {
    it('操作员 A 试图调取操作员 B 的机密档案应被拒绝 403', async () => {
      const otherPlayerId = 'AGENT_OTHER_VICTIM';
      const res = await request(app)
        .get(`/api/load/${otherPlayerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  // 5. 测试 Zod 深度数据清洗防投毒 (400 Validation)
  describe('POST /api/save (数据结构强类型防投毒校验)', () => {
    it('生命值超过 100 上限时应被拦截 400', async () => {
      const res = await request(app)
        .post('/api/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenarioId: 'deepspace_station_13',
          playerState: { hp: 9999, sanity: 80, inventory: [] }, // ❌ 违规数值
          messages: [{ role: 'assistant', content: 'test' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(res.body.details)).toContain('playerState.hp');
    });

    it('缺少通讯记录 messages 时应被拒绝 400', async () => {
      const res = await request(app)
        .post('/api/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenarioId: 'deepspace_station_13',
          playerState: { hp: 100, sanity: 80, inventory: [] },
          messages: [], // ❌ 空数组
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_FAILED');
    });
  });
});