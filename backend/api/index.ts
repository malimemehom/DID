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

// API 路由
app.use('/api', rabbitHoleRouter);

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 导出为 Vercel Serverless Function
export default app;
