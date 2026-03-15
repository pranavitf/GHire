import { pgTable, text, serial, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  industry: text("industry").notNull(),
  averageScore: real("average_score").notNull().default(0),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  verifiedSessions: integer("verified_sessions").notNull().default(0),
  bestScore: real("best_score").notNull().default(0),
  avatarInitials: text("avatar_initials"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityFeedTable = pgTable("activity_feed", {
  id: text("id").primaryKey(),
  userName: text("user_name").notNull(),
  industry: text("industry").notNull(),
  jobTitle: text("job_title").notNull(),
  score: real("score").notNull(),
  achievement: text("achievement"),
  emoji: text("emoji").default("🚀"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portfolioTable = pgTable("portfolios", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userName: text("user_name").notNull(),
  jobTitle: text("job_title").notNull(),
  industry: text("industry").notNull(),
  evaluationJson: text("evaluation_json").notNull(),
  verifiedBadge: boolean("verified_badge").notNull().default(false),
  proctorClean: boolean("proctor_clean").notNull().default(true),
  flagCount: integer("flag_count").notNull().default(0),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
export type ActivityFeedItem = typeof activityFeedTable.$inferSelect;
export type Portfolio = typeof portfolioTable.$inferSelect;
