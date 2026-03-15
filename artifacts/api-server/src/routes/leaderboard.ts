import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leaderboardTable, activityFeedTable, portfolioTable, sessionsTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res) => {
  const { industry, limit } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 50, 100);

  let query = db.select().from(leaderboardTable).orderBy(desc(leaderboardTable.averageScore)).limit(limitNum);
  const entries = await query;

  const ranked = entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  if (industry && industry !== "All") {
    const filtered = ranked.filter(e => e.industry === industry);
    res.json(filtered.map((e, i) => ({ ...e, rank: i + 1 })));
    return;
  }

  res.json(ranked);
});

router.get("/activity-feed", async (req, res) => {
  const { limit } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const items = await db
    .select()
    .from(activityFeedTable)
    .orderBy(desc(activityFeedTable.createdAt))
    .limit(limitNum);

  res.json(items);
});

router.get("/portfolio/:sessionId", async (req, res) => {
  const [portfolio] = await db
    .select()
    .from(portfolioTable)
    .where(eq(portfolioTable.sessionId, req.params.sessionId));

  if (!portfolio) {
    res.status(404).json({ error: "not_found", message: "Portfolio not found" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, req.params.sessionId));

  let evalData: Record<string, unknown> = {};
  try {
    evalData = JSON.parse(portfolio.evaluationJson);
  } catch { /* empty */ }

  res.json({
    sessionId: portfolio.sessionId,
    userName: portfolio.userName,
    jobTitle: portfolio.jobTitle,
    industry: portfolio.industry,
    completedAt: portfolio.completedAt.toISOString(),
    evaluation: {
      sessionId: portfolio.sessionId,
      overallScore: evalData.overallScore ?? 0,
      categoryScores: evalData.categoryScores ?? {},
      strengths: evalData.strengths ?? [],
      improvements: evalData.improvements ?? [],
      verdict: evalData.verdict ?? "",
      verifiedClean: portfolio.verifiedBadge,
      evaluatedAt: portfolio.completedAt.toISOString(),
    },
    verifiedBadge: portfolio.verifiedBadge,
    proctorClean: portfolio.proctorClean,
    flagCount: portfolio.flagCount,
    shareableUrl: `/portfolio/${portfolio.sessionId}`,
  });
});

export default router;
