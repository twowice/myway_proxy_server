import { Router } from 'express';
import odsayController from '../controllers/odsay.controller';

const router = Router();

router.get('/transpath', odsayController.getPubTransPath);

router.get('/loadlane', odsayController.getLoadLane);

export default router;