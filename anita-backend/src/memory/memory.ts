import { pipeline, env } from '@xenova/transformers';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import pool,{ initDB } from '../tools/MySql';

/**
 * 【RAG 向量检索 - 当前实现与扩展规划】
 *
 * 当前 MVP 阶段：将所有向量记录 SELECT 到 Node.js 内存，
 * 使用 for 循环逐条计算余弦相似度，适合百~千级数据量。
 *
 * 已知瓶颈：
 * - 数据量达到万级时，JSON.parse + 内存计算导致延迟显著上升
 * - 达到十万级时，Node.js 堆内存可能溢出 (OOM)
 *
 * 横向扩展方案（按优先级）：
 * 1. PostgreSQL + pgvector：利用数据库原生向量索引(IVFFlat/HNSW)，
 *    在 SQL 层完成 ANN 检索，Node.js 只接收 topK 结果
 * 2. Milvus / Qdrant 等专业向量数据库：适合亿级数据、需要分布式部署的场景
 * 3. 短期缓解：在 MySQL 层增加 player_id + timestamp 联合索引，
 *    并在应用层限制每个玩家最多保留 N 条记忆（LRU 淘汰）
 */


// 【极其关键】：这行代码必须在最顶端，覆盖默认的 Hugging Face 域名
env.remoteHost = 'https://hf-mirror.com';
// 强制允许使用远程（镜像）模型，不允许只从本地找
env.allowRemoteModels = true;

dotenv.config();
//语义记忆系统核心

// 定义内存记录的接口
export interface MemoryRecord {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
}

initDB();

// 全局的特征提取器 (Embedding Model)
let extractor: any = null

/**
 * 核心：将自然语言文本转化为高维向量 (Embedding)
 */
async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    console.log('[系统] 正在初始化本地量子记忆核心...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[系统] 记忆核心初始化完毕！');
  }
  // 使用extractor对文本进行嵌入处理, normalize: true表示归一化,模长为1
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
/**
 * 核心：计算两个向量之间的余弦相似度
 * 因为向量已归一化（模长=1），所以余弦相似度 = 点积
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}
/**
 * 存入记忆 (写入 MySQL 数据库)
 */
export async function saveMemory(actionText: string, playerId: string): Promise<void> {
  try {
    const embedding = await getEmbedding(actionText);
    const id = Math.random().toString(36).substring(2, 15);/// 生成唯一ID
    const timestamp = Date.now();/// 记录时间戳
    const embeddingJson = JSON.stringify(embedding);

    await pool.query(
      'INSERT INTO memories (id, text, embedding, timestamp, player_id) VALUES (?, ?, ?, ?, ?)',
      [id, actionText, embeddingJson, timestamp, playerId]
    );
    console.log(`[记忆已持久化至 MySQL] 碎片: "${actionText.substring(0, 20)}..."`);
  } catch (error) {
    console.error('[记忆归档失败]:', error);
  }
}
/**
 * 检索记忆 (从 MySQL 提取并计算相似度，返回最相关的 topK 条)
 */
export async function retrieveMemories(playerId: string, query: string, topK: number = 3): Promise<string[]> {
    try{
        const queryEmbedding = await getEmbedding(query);/// 获取查询文本的嵌入向量
        // 从数据库中检索所有当前玩家的记忆,返回格式为数组
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT text, embedding FROM memories WHERE player_id = ? ORDER BY timestamp DESC LIMIT 500', [playerId]);

        if (!rows || rows.length === 0) return [];/// 如果没有找到记忆，返回空数组
        
        // 计算查询向量与每个记忆向量的余弦相似度,对数组每一项进行处理。
        // 返回对象数组，包含文本和相似度，相似度为数据库中的值和查询向量的相似度
        const similarities = rows.map((row:any) => {
            // 【核心修复】：增强容错能力，防止历史脏数据导致 JSON.parse 崩溃
            let memEmbedding: number[];
            if (typeof row.embedding === 'string') {
                try {
                // 尝试按标准 JSON 数组解析
                memEmbedding = JSON.parse(row.embedding);
                } catch (e) {
                // 如果报错，说明数据库里存的是没有括号的逗号分隔字符串 (脏数据)
                // 此时我们手动用逗号切分，并转换成数字数组
                memEmbedding = row.embedding.split(',').map(Number);
                }
            } else {
                // 如果 mysql2 驱动已经自动解析成了对象/数组
                memEmbedding = row.embedding;
            }
            return {
                text: row.text,
                similarity: cosineSimilarity(queryEmbedding, memEmbedding)
            };
        });
        // 按相似度降序排序
        similarities.sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity);
        // 打印相似度分数雷达
        console.log("【RAG 相似度分数雷达】:", similarities.slice(0, 3));
        // 返回最相关的 topK 条记忆,相似度大于0.3
        const relevantTexts:string[]=similarities
        .filter((item: { similarity: number }) => item.similarity > 0.3)//查询相似度大于0.3的记忆
        .slice(0, topK)//取前topK个
        .map((item: { text: string }) => item.text);// 提取文本内容
        return relevantTexts;
        
    }
    catch (error) {
        console.error('[记忆检索失败]:', error);
        return [];
    }
}



