import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumeRouter from "./resume";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/resume", resumeRouter);
router.use("/sessions", sessionsRouter);
router.use("/", leaderboardRouter);

export default router;
