import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiErrors';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    console.error(err.stack);
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
};

export default errorHandler;