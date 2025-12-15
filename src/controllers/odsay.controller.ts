// src/controllers/odsay.controller.ts
import { Request, Response, NextFunction } from 'express';
import odsayService from '../services/odsay.service';
import ApiError from '../utils/apiErrors';


class OdsayController {
    public async getPubTransPath(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { sx, sy, ex, ey } = req.query;

            if (!sx || !sy || !ex || !ey) {
                throw new ApiError('출발지(sx, sy)와 목적지(ex, ey) 좌표는 필수입니다.', 400);
            }

            const data = await odsayService.searchPubTransPath(
                sx as string,
                sy as string,
                ex as string,
                ey as string
            );
            res.status(200).json(data);
        } catch (error) {
            next(error);
        }
    }

    public async getLoadLane(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { mapObject } = req.query;

            if (!mapObject) {
                throw new ApiError('mapObject 파라미터는 필수입니다.', 400);
            }

            const data = await odsayService.loadLane(mapObject as string);
            res.status(200).json(data);
        } catch (error) {
            next(error);
        }
    }
}

export default new OdsayController();