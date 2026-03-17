// backend/api/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 延迟导入以使用编译后的 JS 文件
let rabbitHoleRouter: any = null;

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

// 动态导入路由（处理路径问题）
(async () => {
    try {
        // 尝试从不同的路径导入
        const routeModule = await import('../dist/src/routes/rabbithole.js').catch(() => 
            import('../src/routes/rabbithole')
        );
        rabbitHoleRouter = routeModule.setupRabbitHoleRoutes;
        if (typeof rabbitHoleRouter === 'function') {
            app.use('/rabbithole', rabbitHoleRouter(null));
        }
    } catch (err) {
        console.error('Failed to load rabbithole router:', err);
    }
})();

// 404 处理
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err: any, req: Request, res: Response) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 导出为 Vercel Serverless Function
export default app;
// Vercel 会调用这个 app 来处理请求
export default app;
