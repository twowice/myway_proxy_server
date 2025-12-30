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
    private readonly http = axios.create({
        baseURL: 'https://api.odsay.com/v1/api',
        paramsSerializer: (params) =>
            new URLSearchParams(params as Record<string, string>).toString(),
    });

    private buildSearchParams(
        sx: string,
        sy: string,
        ex: string,
        ey: string,
        options?: {
            opt?: string;
            searchType?: string;
            searchPathType?: string;
            lang?: string;
            output?: string;
        }
    ): Record<string, string> {
        const params: Record<string, string> = {
            SX: sx,
            SY: sy,
            EX: ex,
            EY: ey,
            apiKey: this.apiKey,
        };

        if (options?.opt) {
            params.OPT = options.opt;
        }
        if (options?.searchType) {
            params.SearchType = options.searchType;
        }
        if (options?.searchPathType) {
            params.SearchPathType = options.searchPathType;
        }
        if (options?.lang) {
            params.lang = options.lang;
        }
        if (options?.output) {
            params.output = options.output;
        }

        return params;
    }

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
        ey: string,
        options?: {
            opt?: string;
            searchType?: string;
            searchPathType?: string;
            lang?: string;
            output?: string;
        }
    ): Promise<any> {
        await this.checkOdsayCallLimit();
        try {
            const params = this.buildSearchParams(sx, sy, ex, ey, options);
            const response = await this.http.get('/searchPubTransPathT', {
                params,
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

    public async searchPubTransPathWithSegments(
        sx: string,
        sy: string,
        ex: string,
        ey: string,
        options?: {
            opt?: string;
            searchType?: string;
            searchPathType?: string;
            lang?: string;
            output?: string;
        }
    ): Promise<any> {
        const intercityResponse = await this.searchPubTransPath(sx, sy, ex, ey, options);
        const searchType = Number(intercityResponse?.result?.searchType);

        if (searchType !== 1 && searchType !== 2) {
            return intercityResponse;
        }

        const intercityPaths = intercityResponse?.result?.path;
        if (!Array.isArray(intercityPaths) || intercityPaths.length === 0) {
            return intercityResponse;
        }

        const localOptions = {
            ...options,
            searchType: '0',
        };

        const toNumber = (value: unknown): number => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        };

        const combinedPaths = await Promise.all(
            intercityPaths.map(async (intercityPath: any) => {
                const subPaths = intercityPath?.subPath;
                if (!Array.isArray(subPaths) || subPaths.length === 0) {
                    return intercityPath;
                }

                const intercityIndices = subPaths
                    .map((subPath: any, index: number) => ({
                        index,
                        isIntercity: subPath?.trafficType === 4 || subPath?.trafficType === 5,
                    }))
                    .filter((entry: { index: number; isIntercity: boolean }) => entry.isIntercity)
                    .map((entry: { index: number; isIntercity: boolean }) => entry.index);

                if (intercityIndices.length === 0) {
                    return intercityPath;
                }

                const firstIntercityIndex = intercityIndices[0];
                const lastIntercityIndex = intercityIndices[intercityIndices.length - 1];
                const firstIntercitySubPath = subPaths[firstIntercityIndex];
                const lastIntercitySubPath = subPaths[lastIntercityIndex];
                const startX = firstIntercitySubPath?.startX;
                const startY = firstIntercitySubPath?.startY;
                const endX = lastIntercitySubPath?.endX;
                const endY = lastIntercitySubPath?.endY;

                if (!startX || !startY || !endX || !endY) {
                    return intercityPath;
                }

                const [originResult, destinationResult] = await Promise.allSettled([
                    this.searchPubTransPath(
                        sx,
                        sy,
                        String(startX),
                        String(startY),
                        localOptions
                    ),
                    this.searchPubTransPath(
                        String(endX),
                        String(endY),
                        ex,
                        ey,
                        localOptions
                    ),
                ]);

                if (originResult.status !== 'fulfilled' || destinationResult.status !== 'fulfilled') {
                    return intercityPath;
                }

                const originResponse = originResult.value;
                const destinationResponse = destinationResult.value;
                const originPath = originResponse?.result?.path?.[0];
                const destinationPath = destinationResponse?.result?.path?.[0];

                const intercitySegmentSubPaths = subPaths.slice(
                    firstIntercityIndex,
                    lastIntercityIndex + 1
                );

                if (!originPath?.subPath || !destinationPath?.subPath) {
                    return intercityPath;
                }

                const originInfo = originPath?.info ?? {};
                const destinationInfo = destinationPath?.info ?? {};
                const intercityInfo = intercityPath?.info ?? {};

                const totalTime =
                    toNumber(originInfo.totalTime) +
                    toNumber(intercityInfo.totalTime) +
                    toNumber(destinationInfo.totalTime);
                const totalPayment =
                    toNumber(originInfo.payment) +
                    toNumber(intercityInfo.totalPayment) +
                    toNumber(destinationInfo.payment);
                const totalDistance =
                    toNumber(originInfo.totalDistance) +
                    toNumber(intercityInfo.totalDistance) +
                    toNumber(destinationInfo.totalDistance);

                return {
                    ...intercityPath,
                    info: {
                        ...intercityInfo,
                        totalTime,
                        totalPayment,
                        totalDistance,
                    },
                    subPath: [
                        ...originPath.subPath,
                        ...intercitySegmentSubPaths,
                        ...destinationPath.subPath,
                    ],
                };
            })
        );

        return {
            ...intercityResponse,
            result: {
                ...intercityResponse.result,
                path: combinedPaths,
            },
        };
    }

    public async loadLane(mapObject: string): Promise<any> {
        await this.checkOdsayCallLimit();
        try {
            const response = await this.http.get('/loadLane', {
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
