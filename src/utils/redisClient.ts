import Redis from 'ioredis';
import config from '../config/environment';

let redis: Redis | null = null;

if (config.redisUrl) {
    redis = new Redis(config.redisUrl);

    redis.on('connect', () => console.log('Redis client connected'));
    redis.on('error', (err) => console.error('Redis client error:', err));
} else {
    console.warn('REDIS_URL is not set. Skipping Redis connection.');
}

export default redis;