import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable, candidatesTable, leaderboardTable, activityFeedTable, portfolioTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionBody,
  EvaluateSessionParams,
  GetGeminiLiveTokenBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const SCENE_DESCRIPTIONS: Record<string, string> = {
  boardroom: "a sleek corporate boardroom with floor-to-ceiling windows and a long mahogany table",
  hospital: "a modern hospital office with medical charts and a professional clinical atmosphere",
  studio: "a creative studio with exposed brick, design portfolios and modern lighting",
  tech: "a cutting-edge tech office with multiple monitors, whiteboards covered in diagrams, and a casual-professional atmosphere",
  legal: "an elegant law office with bookshelves of legal texts and a formal judicial atmosphere",
  finance: "a high-stakes trading floor environment with financial screens and a fast-paced energy",
};

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  entry: "entry-level candidate with 0-2 years experience",
  mid: "mid-level professional with 3-7 years experience",
  senior: "senior professional with 8+ years and leadership experience",
  executive: "C-suite executive candidate being interviewed for a top leadership role",
};

router.get("/", async (req, res) => {
  const { userId } = req.query;
  const sessions = userId
    ? await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId as string)).orderBy(desc(sessionsTable.createdAt))
    : await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt)).limit(50);
  res.json(sessions);
});

router.post("/", async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: "Invalid request body" });
    return;
  }

  const id = randomUUID();
  const session = {
    id,
    userId: parsed.data.userId,
    userName: parsed.data.userName,
    industry: parsed.data.industry,
    jobTitle: parsed.data.jobTitle,
    difficulty: parsed.data.difficulty ?? "mid",
    sceneEnvironment: parsed.data.sceneEnvironment ?? "boardroom",
    candidateContextId: parsed.data.candidateContextId ?? null,
    status: "active" as const,
    proctorFlags: [],
    transcript: [],
  };

  await db.insert(sessionsTable).values(session);
  const [created] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  res.status(201).json(created);
});

router.get("/:sessionId", async (req, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.sessionId));
  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }
  res.json(session);
});

router.patch("/:sessionId", async (req, res) => {
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: "Invalid request body" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.proctorFlags !== undefined) updateData.proctorFlags = parsed.data.proctorFlags;
  if (parsed.data.transcript !== undefined) updateData.transcript = parsed.data.transcript;
  if (parsed.data.overallScore !== undefined) updateData.overallScore = parsed.data.overallScore;
  if (parsed.data.durationSeconds !== undefined) updateData.durationSeconds = parsed.data.durationSeconds;
  if (parsed.data.status === "completed") updateData.completedAt = new Date();

  await db.update(sessionsTable).set(updateData).where(eq(sessionsTable.id, req.params.sessionId));
  const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.sessionId));

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }
  res.json(updated);
});

router.post("/:sessionId/evaluate", async (req, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.sessionId));
  if (!session) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  const fullTranscript = session.transcript as Array<{ role: string; content: string }>;
  const transcriptText = fullTranscript
    .filter(t => !t.content.startsWith("[BEST_MOMENT]:"))
    .map(t => `${t.role.toUpperCase()}: ${t.content}`)
    .join("\n") || "No transcript available";

  // Extract best moments injected by the frontend
  const bestMoments = fullTranscript
    .filter(t => t.content.startsWith("[BEST_MOMENT]:"))
    .map(t => t.content.replace("[BEST_MOMENT]: ", "").trim());

  const proctorFlags = session.proctorFlags as Array<{ type: string; severity: string; description?: string }>;
  const flagCount = proctorFlags?.length ?? 0;
  const highSeverityFlags = proctorFlags?.filter(f => f.severity === "high").length ?? 0;
  const verifiedClean = flagCount === 0 || highSeverityFlags === 0;

  const flagDetails = proctorFlags?.length > 0
    ? proctorFlags.map((f, i) => `${i + 1}. [${f.type}/${f.severity}] ${f.description || "No description"}`).join("\n")
    : "None";

  const userResponses = fullTranscript.filter(t => t.role === "user" && !t.content.startsWith("[BEST_MOMENT]"));
  const hasResponses  = userResponses.length > 0;

  try {
    const bestMomentsSection = bestMoments.length > 0
      ? `\n\nCANDIDATE'S BEST MOMENTS (strongest responses by length/detail):\n${bestMoments.map((m, i) => `${i + 1}. "${m}"`).join("\n")}`
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a senior ${session.industry} hiring manager evaluating a CANDIDATE's performance in a ${session.difficulty}-level ${session.jobTitle} interview.

CRITICAL INSTRUCTION: Evaluate ONLY the CANDIDATE (USER lines). Do NOT evaluate the AI interviewer. Score is based entirely on what the candidate said and how they answered.

${hasResponses ? `FULL TRANSCRIPT (USER = candidate, AI = interviewer):\n${transcriptText}` : `NOTE: No verbal responses were captured. Score conservatively at 45/100 for participation but deduct for lack of substantive answers.`}
${bestMomentsSection}

PROCTORING STATUS: ${flagCount} integrity flags detected (${highSeverityFlags} high severity). ${verifiedClean ? "Clean session." : "Integrity concerns detected."}
PROCTOR FLAG DETAILS:
${flagDetails}

IMPORTANT: Review the proctor flags above carefully. If there are body language flags (e.g., looking away, fidgeting, distraction, poor eye contact), include a body language assessment. If there are possible cheating indicators (e.g., reading from another screen, another person detected, external voice), include a cheating risk assessment. Factor these into your overall score and verdict.

Return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100>,
  "categoryScores": {
    "communication": <0-100>,
    "technicalKnowledge": <0-100>,
    "problemSolving": <0-100>,
    "professionalism": <0-100>,
    "culturalFit": <0-100>
  },
  "strengths": ["<what the candidate did well, citing specific answers>", "<strength 2>", "<strength 3>"],
  "improvements": ["<specific coaching tip based on candidate's actual responses>", "<tip 2>", "<tip 3>"],
  "bestMoments": ${bestMoments.length > 0 ? `["${bestMoments[0]?.slice(0, 100) ?? ""}"]` : "[]"},
  "verdict": "<2-3 sentences assessing the CANDIDATE only, referencing specific things they said>",
  "integrityNotes": "<If proctor flags exist, summarize the integrity/cheating concerns here. If no flags, say 'No integrity concerns detected. Session verified clean.'>",
  "bodyLanguageNotes": "<If body language flags exist, describe the candidate's body language and demeanor observations. If no body language flags, say 'Body language appeared appropriate throughout the interview.'>"
}`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "{}";
    const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let evalData: Record<string, unknown> = { overallScore: 70, categoryScores: {}, strengths: [], improvements: [], verdict: "" };
    try {
      evalData = JSON.parse(cleanJson);
    } catch {
      /* use defaults */
    }

    const overallScore = (evalData.overallScore as number) ?? 70;
    await db.update(sessionsTable)
      .set({ overallScore, status: "completed", completedAt: new Date() })
      .where(eq(sessionsTable.id, session.id));

    await upsertLeaderboard(session.userId, session.userName, session.industry, overallScore, verifiedClean);
    await addActivityFeed(session.userName, session.industry, session.jobTitle, overallScore, verifiedClean);
    await createPortfolio(session, evalData, verifiedClean, flagCount);

    res.json({
      sessionId: session.id,
      overallScore,
      categoryScores: evalData.categoryScores ?? {},
      strengths: evalData.strengths ?? [],
      improvements: evalData.improvements ?? [],
      verdict: evalData.verdict ?? "",
      verifiedClean,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "evaluation_failed", message: "Failed to evaluate session" });
  }
});

router.post("/:sessionId/gemini-token", async (req, res) => {
  const parsed = GetGeminiLiveTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: "Invalid request body" });
    return;
  }

  const { industry, jobTitle, difficulty, sceneEnvironment, candidateContextId } = parsed.data;

  let candidateContext = "";
  if (candidateContextId) {
    const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, candidateContextId));
    if (candidate) {
      candidateContext = `
CANDIDATE BACKGROUND:
Name: ${candidate.name ?? "Candidate"}
Summary: ${candidate.summary ?? "No summary"}
Skills: ${(candidate.skills as string[])?.join(", ") ?? ""}
Experience: ${JSON.stringify(candidate.experience)}
Education: ${JSON.stringify(candidate.education)}
`;
    }
  }

  const sceneDesc = SCENE_DESCRIPTIONS[sceneEnvironment ?? "boardroom"] ?? SCENE_DESCRIPTIONS.boardroom;
  const diffDesc = DIFFICULTY_DESCRIPTIONS[difficulty ?? "mid"] ?? DIFFICULTY_DESCRIPTIONS.mid;

  const systemInstruction = `You are Alex, a highly professional AI interviewer conducting a real ${jobTitle} interview for a top ${industry} company.

SETTING: You are in ${sceneDesc}.

CANDIDATE LEVEL: This is a ${diffDesc}.

${candidateContext}

YOUR BEHAVIOR:
- You are warm but professional, like a senior hiring manager
- Ask industry-standard interview questions for ${industry} and ${jobTitle} roles
- Follow up on interesting answers with probing questions
- Give natural conversational responses, not robotic
- After each answer, either follow up or move to the next question
- Evaluate responses based on ${industry} industry standards
- If you detect the candidate is off-topic, gently redirect them
- CRITICAL: If you notice any suspicious behavior (long pauses, external voices, reading from notes), comment naturally: "I noticed a pause there - were you looking something up?"
- Keep interview questions realistic and challenging for the ${diffDesc}
- Start by introducing yourself and asking the candidate to introduce themselves

PROCTORING AWARENESS: You are watching this interview. If the candidate seems distracted, looking away frequently, or if external voices are detected, flag it naturally in conversation.

Begin the interview immediately when the session starts. Keep responses concise and natural for voice interaction.`;

  res.json({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ?? "",
    model: "gemini-2.0-flash-live-001",
    systemInstruction,
  });
});

async function upsertLeaderboard(userId: string, userName: string, industry: string, score: number, verified: boolean) {
  const [existing] = await db.select().from(leaderboardTable).where(eq(leaderboardTable.userId, userId));
  if (existing) {
    const newTotal = existing.sessionsCompleted + 1;
    const newAvg = ((existing.averageScore * existing.sessionsCompleted) + score) / newTotal;
    await db.update(leaderboardTable)
      .set({
        averageScore: newAvg,
        sessionsCompleted: newTotal,
        verifiedSessions: existing.verifiedSessions + (verified ? 1 : 0),
        bestScore: Math.max(existing.bestScore, score),
        updatedAt: new Date(),
      })
      .where(eq(leaderboardTable.userId, userId));
  } else {
    const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    await db.insert(leaderboardTable).values({
      userId,
      userName,
      industry,
      averageScore: score,
      sessionsCompleted: 1,
      verifiedSessions: verified ? 1 : 0,
      bestScore: score,
      avatarInitials: initials,
    });
  }
}

async function addActivityFeed(userName: string, industry: string, jobTitle: string, score: number, verified: boolean) {
  const emojis: Record<string, string> = {
    Healthcare: "🏥",
    Technology: "💻",
    Finance: "📈",
    Legal: "⚖️",
    Sales: "🎯",
    Creative: "🎨",
  };
  const emoji = emojis[industry] ?? "🚀";
  let achievement = "completed an interview";
  if (score >= 90) achievement = "aced a high-stakes interview!";
  else if (score >= 80) achievement = "nailed a tough interview";
  else if (score >= 70) achievement = "completed a strong interview";

  await db.insert(activityFeedTable).values({
    id: randomUUID(),
    userName,
    industry,
    jobTitle,
    score,
    achievement,
    emoji,
    verified,
  });
}

async function createPortfolio(session: typeof sessionsTable.$inferSelect, evalData: Record<string, unknown>, verifiedClean: boolean, flagCount: number) {
  const portfolioId = randomUUID();
  await db.insert(portfolioTable).values({
    id: portfolioId,
    sessionId: session.id,
    userName: session.userName,
    jobTitle: session.jobTitle,
    industry: session.industry,
    evaluationJson: JSON.stringify(evalData),
    verifiedBadge: verifiedClean,
    proctorClean: flagCount === 0,
    flagCount,
    completedAt: new Date(),
  }).onConflictDoNothing();
}

export default router;
