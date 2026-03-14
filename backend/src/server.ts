import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupRabbitHoleRoutes } from './routes/rabbithole';
import { setupAuthRoutes } from './routes/auth';
import { setupChatRoutes } from './routes/chat';
import setupHistoryRoutes from './routes/history';
import { getDB } from './db/database';
import { setupNewFeatureRoutes } from './routes/newFeature';
// ...app.use('/api/new-feature', setupNewFeatureRoutes());
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use('/api', setupRabbitHoleRoutes(null));
app.use('/api', setupChatRoutes());
app.use('/api/auth', setupAuthRoutes());
app.use('/api/history', setupHistoryRoutes()); // Mounted history routes

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist/frontend')));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/frontend/index.html'));
});

// Export the setup express app for Vercel Serverless
export default app;

// Only start the server locally if we're not running on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  getDB().then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }).catch(err => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
}