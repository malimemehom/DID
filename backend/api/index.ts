// backend/api/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRabbitHoleRoutes } from '../src/routes/rabbithole';

dotenv.config();

const app = express();

// 中间件
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'https://rabbitholes.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/rabbithole', setupRabbitHoleRoutes(null));

// 404 处理
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', path: req.path });
});

// 全局错误处理
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
});

// 导出为 Vercel Serverless Function
export default app;
