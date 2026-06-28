import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "@/routes/health";
import chatRouter from "@/routes/chat"
import userSessionRouter from "@/routes/userSession";
import {chatLimiter,globalLimiter} from "@/tools/Limiter"

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


// 启动
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` A.N.I.T.A. BACKEND ONLINE PORT: ${PORT}`);
  console.log(`===============================================`);
});
