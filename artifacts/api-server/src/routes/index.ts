import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keysRouter from "./keys";
import filesRouter from "./files";
import roomsRouter from "./rooms";
import downloadRouter from "./download";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keysRouter);
router.use(filesRouter);
router.use(roomsRouter);
router.use(downloadRouter);

export default router;
