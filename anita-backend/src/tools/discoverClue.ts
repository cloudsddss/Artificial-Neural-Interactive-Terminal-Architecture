//定义发现线索的工具
// 用 Zod 定义参数的类型和校验规则
import { z } from 'zod'

// 定义发现线索方法，接受玩家状态作为参数
export const discoverClueTool = {
    description: '【强制规则】当玩家通过调查、破解、阅读日志获得关键密码、实验记录、隐藏档案等线索时，必须调用此工具收录线索。',
    inputSchema: z.object({
        clueId: z.string().describe('线索唯一ID（如 "passcode_lab_01", "log_anita_origin"）。'),
        title: z.string().describe('线索标题（如 "0x04 实验室通行密码"）。'),
        content: z.string().describe('线索的具体内容或解密详情。'),
    }),
    execute: async ({ clueId, title, content }: {
        clueId: string;
        title: string;
        content: string;
    }) => {
        console.log(`[A.N.I.T.A. CLUE DISCOVERED]: 线索 [${title}] (ID: ${clueId}) -> ${content}`);
        return {
            status: 'executed',
            appliedChanges: { clueId, title, content },
        };
    },
}