import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "@/routes/health";
import chatRouter from "@/routes/chat"
import userSessionRouter from "@/routes/userSession";
import scenariosRouter from "@/routes/scenarios";
import {chatLimiter,globalLimiter} from "@/tools/Limiter"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler"; // 👈 引入错误守卫
import { initDB } from "./tools/MySql";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST"],
}));
app.use(express.json());
app.use(globalLimiter);              // 全局限流


app.use('/health', healthRouter);
app.use('/api/chat', chatRouter,chatLimiter);// 聊天接口加专属限流
app.use('/api', userSessionRouter);
app.use('/api/scenarios', scenariosRouter);


// ============================================================
// ★ 全局安全防御防线（必须挂载在所有业务路由之后）★
// ============================================================
// 1. 404 未知端点兜底拦截
app.use(notFoundHandler);
// 2. 统一全局异常处理中间件（熔断未知系统错误，隐匿敏感堆栈）
app.use(errorHandler);


// 启动
// 启动：非测试环境才真正启动端口监听
if (process.env.NODE_ENV !== 'test') {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` A.N.I.T.A. BACKEND ONLINE PORT: ${PORT}`);
      console.log(`===============================================`);
    });
  });
}

// 🛡️ 导出 app 实例，供 Supertest 自动化测试调用
export default app;
