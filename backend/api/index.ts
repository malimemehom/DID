// backend/api/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rabbitHoleRouter from '../src/routes/rabbithole';

dotenv.config();

const app = express();

// 中间件
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'https://rabbitholes.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 健康检查（放在路由前面）
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/rabbithole', rabbitHoleRouter);

// 404 处理
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// 导出为 Vercel Serverless Function
// Vercel 会调用这个 app 来处理请求
export default app;
