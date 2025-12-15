// src/app.ts
import express from 'express';
import cors from 'cors';
import odsayRoutes from './routes/odsay.routes';
import errorHandler from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/odsay', odsayRoutes);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Not Found' });
});

app.use(errorHandler);

export default app;