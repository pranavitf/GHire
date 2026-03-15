# InterView.ai — Universal Career Simulation Platform

## Overview

InterView.ai is a premium, immersive AI-powered interview simulation platform. Features a dark futuristic UI with:
- 3D interview room placeholder (ready for React Three Fiber integration)
- Gemini AI-powered resume parsing and interview evaluation
- Live social leaderboard with industry filtering
- Real-time activity feed
- Post-session spotlight portfolio with verified anti-cheat badges
- Career Hub with drag-and-drop resume upload

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/interview-ai) with Tailwind CSS, Framer Motion, Lucide React
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Gemini 2.5 Flash via Replit AI Integrations (resume parsing, session evaluation)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── interview-ai/       # React + Vite frontend (serves at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-gemini-ai/  # Gemini AI client
├── scripts/                # Utility scripts
└── pnpm-workspace.yaml
```

## Database Schema

- `interview_sessions` — interview session records, proctoring flags, transcripts, scores
- `leaderboard_entries` — per-user aggregate scores across industries
- `activity_feed` — recent session activity for social feed
- `portfolios` — post-session spotlight portfolios with evaluation JSON
- `candidate_contexts` — parsed resume data from PDF uploads

## API Routes (all under /api)

- `GET /api/healthz` — health check
- `POST /api/resume/parse` — Gemini-powered PDF resume parsing
- `GET/POST /api/sessions` — list/create interview sessions
- `GET/PATCH /api/sessions/:id` — get/update session
- `POST /api/sessions/:id/evaluate` — AI evaluation with Gemini
- `POST /api/sessions/:id/gemini-token` — get Gemini Live connection config
- `GET /api/leaderboard` — ranked leaderboard (filterable by industry)
- `GET /api/activity-feed` — recent activity items
- `GET /api/portfolio/:sessionId` — spotlight portfolio

## Frontend Pages

- `/` — Landing page with hero and career field cards
- `/hub` — Career Hub with resume upload and simulation setup
- `/interview/:sessionId` — Live interview session room
- `/leaderboard` — Social leaderboard with live feed
- `/portfolio/:sessionId` — Post-session spotlight portfolio

## Key Features

- Resume PDF base64 upload → Gemini extracts structured CandidateContext
- Session creation with industry, job title, difficulty, 3D scene selection
- AI evaluation generates scores across 5 categories
- Proctoring flags tracked per session (gaze_away, external_voice, etc.)
- Leaderboard auto-updates after session evaluation
- Portfolio generated with "Verified Clean" anti-cheat badge

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provisioned by Replit)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini API proxy URL
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini API key (managed by Replit)
- `PORT` — Server port (auto-assigned)
