import { Router, Request, Response } from "express";
import { streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { buildSystemPrompt } from '../prompts/system';
import { retrieveMemories, saveMemory } from '../memory/memory';
import { resolveAction } from '../arbiter/arbiter';

const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { messages, playerState, playerId } = req.body;

  // ---- 0. 参数校验：SSE 头设置之前，保持 400 JSON 语义不变 ----
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '没有提供消息。' }); return;
  }
  if (!playerState || typeof playerState !== 'object') {
    res.status(400).json({ error: '玩家状态无效。' }); return;
  }
  if (!playerId || typeof playerId !== 'string') {
    res.status(400).json({ error: '玩家ID无效。' }); return;
  }
  const lastUserMsg = messages[messages.length - 1].content;

  // ---- 1. SSE 响应头：加 no-transform + X-Accel-Buffering 防 Nginx 缓冲/压缩破坏流 ----
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // ---- 2. 安全写入器：客户端断开后所有 write 静默失败，绝不抛 EPIPE ----
  res.on('error', () => { /* 吞掉 EPIPE/ERR_STREAM_WRITE_AFTER_END，仅日志 */ });
  const sendEvent = (event: string, data: string): boolean => {
    if (res.writableEnded || res.destroyed) return false;
    res.write(`event: ${event}\ndata: ${data}\n\n`);
    return true;
  };

  // ---- 3. 心跳保活：每 15s 一个 ping（在模型首 token 到达前就已开始）----
  const heartbeat = setInterval(() => sendEvent('ping', '{}'), 15000);

  let clientDisconnected = false;
  let streamResult: any = null;
  let lastText = '';
  let streamError = false;

  // 客户端断开：停心跳 + 终止上游模型请求（省 token/费用）
  req.on('close', () => {
    clientDisconnected = true;
    clearInterval(heartbeat);
    if (streamResult) { try { streamResult.abort(); } catch { /* 版本差异兜底 */ } }
  });

  try {
    // ---- 4. 记忆检索 ----
    const pastMemories = await retrieveMemories(playerId, lastUserMsg);
    const memoryContext = pastMemories.length > 0
      ? pastMemories.map((m: string) => `- ${m}`).join('\n')
      : "无相关历史记录。";

    // ============================================================
    // ★ 阶段一：裁决节点 (Arbiter Engine)
    // 纯逻辑推理，得出数值、物品、线索与事实描述
    // ============================================================
    const decision = await resolveAction(lastUserMsg, playerState, memoryContext);

    // ============================================================
    // ★ 中间层：规则引擎校验 + 立即推送 tool 事件给前端
    // ============================================================
    // 1. 状态数值与环境威胁变化
    if (
      decision.hpChange !== 0 ||
      decision.sanityChange !== 0 ||
      (decision.integrationChange && decision.integrationChange !== 0) ||
      (decision.newHazards && decision.newHazards.length > 0)
    ) {
      sendEvent('tool', JSON.stringify({
        toolName: 'updateSystemState',
        hpChange: decision.hpChange,
        sanityChange: decision.sanityChange,
        integrationChange: decision.integrationChange ?? 0,
        newHazards: decision.newHazards,
        systemLog: decision.systemLog,
      }));
    }

    // 2. 道具使用校验（严格防作弊校验）
    let itemActuallyUsed = null;
    if (decision.itemToUse) {
      const hasItem = (playerState.inventory ?? []).includes(decision.itemToUse.item);
      if (hasItem) {
        itemActuallyUsed = decision.itemToUse;
        sendEvent('tool', JSON.stringify({
          toolName: 'useInventoryItem',
          ...decision.itemToUse,
        }));
      }
    }

    // 3. 线索发现
    if (decision.clueDiscovered) {
      sendEvent('tool', JSON.stringify({
        toolName: 'discoverClue',
        ...decision.clueDiscovered,
      }));
    }

    // 4. 计算生效后的最新玩家状态，供阶段二主脑提示词使用
    const updatedPlayerState = {
      ...playerState,
      hp: Math.max(0, Math.min(100, (playerState.hp ?? 100) + decision.hpChange)),
      sanity: Math.max(0, Math.min(100, (playerState.sanity ?? 100) + decision.sanityChange)),
      integration: Math.max(0, Math.min(100, (playerState.integration ?? 15) + (decision.integrationChange ?? 0))),
      hazards: decision.newHazards && decision.newHazards.length > 0
        ? [...new Set([...(playerState.hazards ?? []), ...decision.newHazards])]
        : playerState.hazards,
      inventory: itemActuallyUsed
        ? (playerState.inventory ?? []).filter((i: string) => i !== itemActuallyUsed.item)
        : playerState.inventory,
    };

    // ============================================================
    // ★ 阶段二：主脑叙事流 (Narrator Stream)
    // 纯文本流式输出冷酷台词，不带 tools，不再可能伪造警告
    // ============================================================
    streamResult = await streamText({
      model: deepseek(process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'),
      system: buildSystemPrompt(updatedPlayerState, memoryContext, decision.factForNarrator),
      messages: messages,
    });

    for await (const part of streamResult.fullStream) {
      if (clientDisconnected) break;
      if (part.type === 'text-delta') {
        const safeText = JSON.stringify(part.text);
        if (!sendEvent('text', safeText)) break;
        lastText += part.text;
      } else if (part.type === 'error') {
        streamError = true;
        sendEvent('error', JSON.stringify({ code: 'STREAM_ERROR', message: '模型流异常中断' }));
        break;
      }
    }

    if (!clientDisconnected && !streamError) {
      sendEvent('end', '{}');
    }

    // 异步记忆存档
    const summary = `玩家动作：[${lastUserMsg}]。判定事实：[${decision.factForNarrator}]。主脑回应：${lastText.substring(0, 80)}`;
    setTimeout(() => saveMemory(summary, playerId), 0);
  } catch (error) {
    console.error('A.N.I.T.A. System Error:', error);
    if (clientDisconnected || res.destroyed) return;
    sendEvent('error', JSON.stringify({ code: 'SYSTEM_FAILURE', message: 'A.N.I.T.A. 系统故障' }));
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
});

export default chatRouter;

