import dotenv from 'dotenv';
dotenv.config();

interface Config {
    odsayApiKey: string;
    port: number;
    proxyInternalApiKey?: string;
    redisUrl?: string
}

const config: Config = {
    odsayApiKey: process.env.ODSAY_API_KEY || '',
    port: parseInt(process.env.PORT || '3000', 10),
    proxyInternalApiKey: process.env.PROXY_INTERNAL_API_KEY,
    redisUrl: process.env.REDIS_URL
};

if (!config.odsayApiKey) {
    console.error('ERROR: ODSAY_API_KEY is not set in .env file.');
    process.exit(1);
}
if (!config.redisUrl) {
    console.error('ERROR: REDIS URL is not set in .env file.');
    process.exit(1);
}

export default config;