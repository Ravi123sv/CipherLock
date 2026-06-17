import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keysRouter from "./keys";
import filesRouter from "./files";
import roomsRouter from "./rooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keysRouter);
router.use(filesRouter);
router.use(roomsRouter);

export default router;
