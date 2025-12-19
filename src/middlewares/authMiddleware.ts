// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import config from '../config/environment';
import ApiError from '../utils/apiErrors';


const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!config.proxyInternalApiKey) {
        return next();
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== config.proxyInternalApiKey) {
        throw new ApiError('Unauthorized: Invalid or missing Myway API key', 401);
    }
    next();
};

export default authMiddleware;