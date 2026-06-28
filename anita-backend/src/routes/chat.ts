import {Router, Request, Response} from "express"
import {streamText} from 'ai'
import { deepseek } from '@ai-sdk/deepseek';
import { buildSystemPrompt } from '../prompts/system';
import { updateSystemStateTool } from '../tools/updateSystemState';
import { retrieveMemories, saveMemory } from '../memory/memory';

const chatRouter = Router()

/**
 * 
 * 聊天接口
 * 请求参数：
 * - messages: 消息列表，数组格式，每条消息包含角色和内容
 * - playerState: 玩家当前状态，JSON格式
 * - playerId: 玩家ID，字符串类型
 * 响应参数：
 * - 事件流 (SSE)，包含大模型的文本响应和工具调用指令
 * 
 * 处理流程：
 * 1. 接收玩家消息和状态
 * 2. 自动检索相关记忆，构建系统提示词
 * 3. 调用大模型生成响应，监听全量事件流
 * 4. 将文本响应和工具调用指令通过 SSE 实时发送给前端
 * 5. 在响应结束后自动将新的记忆存档到数据库
 * 
 * 注意事项：
 * - 需要前端支持 SSE 协议，能够处理 'text' 和 'tool' 两种事件类型
 * - 大模型的工具调用会直接触发前端对应功能的执行，因此要确保工具接口的安全性和稳定性
 * - 记忆存档是异步进行的，不会阻塞当前聊天响应，但可能会有短暂的延迟
 * - 需要确保数据库连接池的稳定性，避免在高并发情况下出现连接问题
 * - 这是 A.N.I.T.A. 系统的核心接口，承载了玩家与大模型交互的全部逻辑，因此需要特别注意错误处理和性能优化
 * - 未来可以考虑增加更多的工具调用类型，以及更复杂的系统提示词构建逻辑，以提升 A.N.I.T.A. 的智能水平和交互体验
*/
chatRouter.post('/',async (req: Request, res: Response) => {
    try{
        const {messages,playerState,playerId }=req.body
        console.log(messages,playerState)
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ error: '没有提供消息。' });
            return;
        }
        if (!playerState || typeof playerState !== 'object') {
            res.status(400).json({ error: '玩家状态无效。' });
            return;
        }
        if (!playerId || typeof playerId !== 'string') {
            res.status(400).json({ error: '玩家ID无效。' });
            return;
        }

        //取用户最新的消息
        const lastUserMsg=messages[messages.length-1].content

        // 自动检索相关记忆
        const pastMemories = await retrieveMemories(playerId, lastUserMsg);
        const memoryContext = pastMemories.length > 0
        ? pastMemories.map((m: string) => `- ${m}`).join('\n')
        : "无相关历史记录。";
        console.log('[记忆检索]', pastMemories);


        // 1. 设置响应头，声明这是一个 SSE (Server-Sent Events) 流
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        //处理请求，建立流式输出文本
        const result=await streamText({
            model:deepseek(process.env.DEEPSEEK_MODEL||'deepseek-v4-flash'),
            system: buildSystemPrompt(playerState,memoryContext),
            messages:messages,
            tools:{
                updateSystemState: updateSystemStateTool,
            }
        })
        let lastText = '';
        // 2. 监听全量事件流 (fullStream)
        for await (const Part of result.fullStream){
            // 将普通剧情文本包装成 'text' 事件发送
            // 将换行符等特殊字符转义，防止破坏 SSE 协议结构
            if(Part.type==='text-delta'){
                const textPart=Part.text;
                const safeText = JSON.stringify(textPart); 
                res.write(`event: text\ndata: ${safeText}\n\n`);
                lastText += textPart;
            }
            if(Part.type==='tool-call'){
                // 这是大模型决定调用工具的瞬间！
                // 我们在这里把工具调用的参数包装成 'tool' 事件发给前端
                console.log(`[调用工具]`, Part.toolName);
                if (Part.toolName === 'updateSystemState') {
                    console.log(`[发送工具指令到前端]`, Part.input);
                    res.write(`event: tool\ndata: ${JSON.stringify(Part.input)}\n\n`);
                }
            }
            
        }
        // 3. 流结束时关闭连接
        res.write('event: end\ndata: {}\n\n');
        res.end();
        //自动将记忆进行存档,异步存档
        setTimeout(()=>{
            const summary=`玩家动作：[${lastUserMsg}]。回应大意：${lastText.substring(0, 100)}`
            saveMemory(summary, playerId)
        },0)


        console.log(lastText);
    }
    catch(error){
        console.error('A.N.I.T.A. System Error:', error);
        // res.status(500).json({ error: 'SYSTEM CORE FAILURE.' });
        res.write(`event: text\ndata: "[A.N.I.T.A. 系统故障]"\n\n`);
        res.end();
    }
})

export default chatRouter;
