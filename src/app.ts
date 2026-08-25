import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/users';
import documentRoutes from './routes/documents';
import importRoutes from './routes/import';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    message: 'API is running',
    database: isConnected ? 'connected' : 'disconnected',
  });
});

export default app;
