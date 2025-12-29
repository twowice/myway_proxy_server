// src/controllers/odsay.controller.ts
import { Request, Response, NextFunction } from 'express';
import odsayService from '../services/odsay.service';
import ApiError from '../utils/apiErrors';


class OdsayController {
    public async getPubTransPath(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { sx, sy, ex, ey } = req.query;
            const opt = (req.query.opt ?? req.query.OPT) as string | undefined;
            const searchType = (req.query.searchType ?? req.query.SearchType) as string | undefined;
            const searchPathType = (req.query.searchPathType ?? req.query.SearchPathType) as string | undefined;
            const lang = (req.query.lang ?? req.query.Lang) as string | undefined;
            const output = (req.query.output ?? req.query.Output) as string | undefined;

            if (!sx || !sy || !ex || !ey) {
                throw new ApiError('출발지(sx, sy)와 목적지(ex, ey) 좌표는 필수입니다.', 400);
            }

            const options = {
                opt,
                searchType,
                searchPathType,
                lang,
                output,
            };

            const data = await odsayService.searchPubTransPathWithSegments(
                sx as string,
                sy as string,
                ex as string,
                ey as string,
                options
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
