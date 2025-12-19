// src/services/odsay.service.ts
import axios from 'axios';
import config from '../config/environment';
import redis from '../utils/redisClient';
import ApiError from '../utils/apiErrors';

class OdsayService {
    private readonly baseUrl: string = 'https://api.odsay.com/v1/api';
    private readonly apiKey: string = config.odsayApiKey;
    private readonly apiCallLimitPerDay: number = 1000;
    private readonly odsayCallCountKey = 'odsay_total_calls';
    private readonly odsayCallCountExpireKey = 'odsay_total_calls_expire';

    private async checkOdsayCallLimit(): Promise<void> {
        if (!redis) {
            console.warn('Redis client not available. Odsay API call limit not enforced globally.');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const currentDay = await redis.get(this.odsayCallCountExpireKey);

        if (currentDay !== today) {
            await redis.set(this.odsayCallCountKey, 0);
            await redis.set(this.odsayCallCountExpireKey, today);
            const now = new Date();
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
            const secondsUntilMidnight = Math.floor((endOfToday.getTime() - now.getTime()) / 1000);
            await redis.expire(this.odsayCallCountKey, secondsUntilMidnight);
            await redis.expire(this.odsayCallCountExpireKey, secondsUntilMidnight);
        }

        const currentCallsStr = await redis.get(this.odsayCallCountKey);
        const currentCalls = currentCallsStr ? parseInt(currentCallsStr, 10) : 0;

        if (currentCalls >= this.apiCallLimitPerDay) {
            throw new ApiError('일일 Odsay API 호출 제한을 초과했습니다. 잠시 후 다시 시도해주세요.', 429);
        }
    }

    private async incrementOdsayCallCount(): Promise<void> {
        if (!redis) {
            return;
        }
        const currentCalls = await redis.incr(this.odsayCallCountKey);
        console.log(`ODsay API calls today: ${currentCalls}/${this.apiCallLimitPerDay}`);
    }

    public async searchPubTransPath(
        sx: string,
        sy: string,
        ex: string,
        ey: string
    ): Promise<any> {
        await this.checkOdsayCallLimit();
        try {
            const response = await axios.get(`${this.baseUrl}/searchPubTransPathT`, {
                params: {
                    SX: sx,
                    SY: sy,
                    EX: ex,
                    EY: ey,
                    apiKey: this.apiKey,
                },
            });

            // API 호출 성공 시에만 카운트 증가
            await this.incrementOdsayCallCount();
            return response.data;
        } catch (error: any) {
            console.error('ODsay searchPubTransPathT API Error:', error.response?.data || error.message);
            if (error.response) {
                throw new ApiError(
                    `ODsay searchPubTransPathT API 오류: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
                    error.response.status
                );
            }
            throw new ApiError('ODsay searchPubTransPathT API 호출 중 문제가 발생했습니다.', 500);
        }
    }

    public async loadLane(mapObject: string): Promise<any> {
        await this.checkOdsayCallLimit();
        try {
            const response = await axios.get(`${this.baseUrl}/loadLane`, {
                params: {
                    mapObject: mapObject,
                    apiKey: this.apiKey,
                },
            });

            // API 호출 성공 시에만 카운트 증가
            await this.incrementOdsayCallCount();
            return response.data;
        } catch (error: any) {
            console.error('ODsay loadLane API Error:', error.response?.data || error.message);
            if (error.response) {
                throw new ApiError(
                    `ODsay loadLane API 오류: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
                    error.response.status
                );
            }
            throw new ApiError('ODsay loadLane API 호출 중 문제가 발생했습니다.', 500);
        }
    }
}

export default new OdsayService();