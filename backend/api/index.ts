// backend/api/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRabbitHoleRoutes } from '../src/routes/rabbithole';
import { setupAuthRoutes } from '../src/routes/auth';
import { setupChatRoutes } from '../src/routes/chat';
import setupHistoryRoutes from '../src/routes/history';

dotenv.config();

const app = express();

// 动态 CORS 配置 - 允许来自已知域名和所有 Vercel 部署的请求
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // 允许的顶级域名列表
        const allowedDomains = [
            'localhost',
            'vercel.app',
            'rabbitholes.vercel.app',
            'did-frontend-sigma.vercel.app',
            process.env.FRONTEND_URL
        ];

        // 如果没有 origin（如同源请求），允许
        if (!origin) {
            callback(null, true);
            return;
        }

        // 检查是否在允许列表中
        const isAllowed = allowedDomains.some(domain => 
            domain && origin.includes(domain)
        );

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from ${origin}`);
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400 // 24 小时
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// OPTIONS 预检请求处理（确保对所有路由都有效）
app.options('*', cors(corsOptions));

// 健康检查
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路由 - API 信息
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'RabbitHoles API Server',
        version: '1.0.2',
        baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001',
        endpoints: {
            health: '/health',
            search: '/rabbitholes/search',
            chat: '/chat'
        }
    });
});

// API 路由
// Note: frontend expects /rabbitholes/* (plural), so we mount both.
app.use('/rabbithole', setupRabbitHoleRoutes(null));
app.use('/rabbitholes', setupRabbitHoleRoutes(null));

// Chat Routes (mount on both /api and root for compatibility)
app.use('/api', setupChatRoutes());
app.use('/', setupChatRoutes());

// Auth & History Routes
app.use('/api/auth', setupAuthRoutes());
app.use('/auth', setupAuthRoutes());
app.use('/api/history', setupHistoryRoutes());
app.use('/history', setupHistoryRoutes());

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
