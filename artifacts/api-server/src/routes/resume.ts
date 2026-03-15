import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { candidatesTable } from "@workspace/db/schema";
import {
  ParseResumeBody,
  ParseResumeResponse,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.post("/parse", async (req, res) => {
  const parsed = ParseResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: "Invalid request body" });
    return;
  }

  const { pdfBase64, fileName } = parsed.data;

  try {
    const prompt = `You are an expert resume parser. Extract structured information from this resume PDF (provided as base64).

Return a JSON object with EXACTLY these fields:
{
  "name": "Full name or null",
  "email": "email or null",
  "phone": "phone number or null",
  "summary": "professional summary paragraph or null",
  "experience": [{"company": "...", "role": "...", "duration": "...", "highlights": ["..."]}],
  "education": [{"institution": "...", "degree": "...", "year": "..."}],
  "skills": ["skill1", "skill2", ...],
  "targetRoles": ["possible job title 1", "possible job title 2"],
  "industryField": "Primary industry (e.g. Healthcare, Technology, Finance, Legal, Sales, Creative)"
}

The PDF content is base64 encoded. Parse it thoroughly and extract all relevant career information.
Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
          ],
        },
      ],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "{}";
    const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed_data: Record<string, unknown> = {};
    try {
      parsed_data = JSON.parse(cleanJson);
    } catch {
      parsed_data = { skills: [] };
    }

    const id = randomUUID();
    const candidate = {
      id,
      name: (parsed_data.name as string) ?? null,
      email: (parsed_data.email as string) ?? null,
      phone: (parsed_data.phone as string) ?? null,
      summary: (parsed_data.summary as string) ?? null,
      experience: (parsed_data.experience as unknown[]) ?? [],
      education: (parsed_data.education as unknown[]) ?? [],
      skills: (parsed_data.skills as string[]) ?? [],
      targetRoles: (parsed_data.targetRoles as string[]) ?? [],
      industryField: (parsed_data.industryField as string) ?? null,
      rawText: cleanJson,
    };

    await db.insert(candidatesTable).values(candidate);

    res.json(candidate);
  } catch (err) {
    console.error("Resume parse error:", err);
    res.status(500).json({ error: "parse_failed", message: "Failed to parse resume" });
  }
});

export default router;
