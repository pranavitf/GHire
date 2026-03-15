import { pgTable, text, serial, real, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("interview_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  industry: text("industry").notNull(),
  jobTitle: text("job_title").notNull(),
  difficulty: text("difficulty").default("mid"),
  sceneEnvironment: text("scene_environment").default("boardroom"),
  status: text("status").notNull().default("active"),
  proctorFlags: jsonb("proctor_flags").$type<ProctorFlag[]>().default([]),
  transcript: jsonb("transcript").$type<TranscriptEntry[]>().default([]),
  overallScore: real("overall_score"),
  durationSeconds: integer("duration_seconds"),
  candidateContextId: text("candidate_context_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type ProctorFlag = {
  type: "gaze_away" | "external_voice" | "external_person" | "tab_switch" | "other";
  timestamp: number;
  description?: string;
  severity: "low" | "medium" | "high";
};

export type TranscriptEntry = {
  role: "ai" | "user";
  content: string;
  timestamp: number;
};

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ createdAt: true, completedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
