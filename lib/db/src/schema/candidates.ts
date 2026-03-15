import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const candidatesTable = pgTable("candidate_contexts", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  summary: text("summary"),
  experience: jsonb("experience").$type<WorkExperience[]>().default([]),
  education: jsonb("education").$type<Education[]>().default([]),
  skills: jsonb("skills").$type<string[]>().default([]),
  targetRoles: jsonb("target_roles").$type<string[]>().default([]),
  industryField: text("industry_field"),
  rawText: text("raw_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WorkExperience = {
  company: string;
  role: string;
  duration?: string;
  highlights?: string[];
};

export type Education = {
  institution: string;
  degree: string;
  year?: string;
};

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ createdAt: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
