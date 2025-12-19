// src/app.ts
import express from 'express';
import axios from 'axios';
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
app.get('/check-my-ip', async (req, res) => {
    try {
        const response = await axios.get<{ ip: string }>('https://api.ipify.org?format=json');
        const ip = response.data.ip;
        res.status(200).json({
            message: '이 주소가 Odsay API 서버에 표시되는 당신 서버의 "나가는 IP" 입니다.',
            egress_ip: ip
        });
    } catch (error: any) {
        res.status(500).json({
            message: '나가는 IP 주소를 가져오는데 실패했습니다.',
            error: error.message
        });
    }
});

app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Not Found' });
});

app.use(errorHandler);

export default app;