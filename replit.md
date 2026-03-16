# GHire — The Universal Hiring Network

## Overview

GHire is a premium, immersive AI-powered competitive hiring platform. Features a dark futuristic UI with:
- Split-screen interview room with code editor/whiteboard and 3D avatar
- Gemini Live WebSocket voice conversations with real-time vision (reads code on screen)
- Countdown timer with curveball stress injection at halfway mark
- Gemini AI-powered resume parsing and interview evaluation
- Live social leaderboard with industry filtering
- Real-time scrolling activity ticker on the hero page
- Post-session spotlight portfolio with verified anti-cheat badges
- Candidate Hub (portfolio dashboard) with past scores, weakness coaching, and LinkedIn-optimized sharing cards
- Recruiter God-Mode dashboard with candidate data table and highlight playback
- Career Hub with drag-and-drop resume upload and settings modal (profession + duration slider)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/interview-ai) with Tailwind CSS, Framer Motion, Lucide React
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Gemini 2.5 Flash (Live voice via WebSocket, evaluation via Replit AI Integrations proxy)
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
├── Dockerfile.api          # API server Docker for Cloud Run (port 8080)
├── Dockerfile.web          # Frontend nginx Docker for Cloud Run (port 8080)
├── deploy-gcp.sh           # GCP Cloud Run deployment script
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

- `/` — Hero page with GHire branding, animated split-screen demo, scrolling activity ticker
- `/hub` — Career Hub with resume upload, interview setup, and settings modal (profession + duration slider)
- `/interview/:sessionId` — Split-screen interview room (50/50: avatar+webcam | code editor) with countdown timer, curveball injector, body language detection, graceful exit
- `/leaderboard` — Social leaderboard with live feed
- `/portfolio/:sessionId` — Post-session spotlight portfolio with score ring, best moments, strengths/improvements
- `/portfolio` — Candidate Hub dashboard (login-gated) with past scores, weakness coaching, functional share (copy link, export card image, LinkedIn share)
- `/recruiter` — Recruiter dashboard (login-gated) with candidate table, search/filter, shortlist/selection, highlight playback, and full interview transcript viewer

## Key Features

- Resume PDF base64 upload → Gemini extracts structured CandidateContext
- Session creation with industry, job title, difficulty, 3D scene selection, duration (2-15 min)
- Gemini Live WebSocket voice: real-time bidirectional audio with ARIA
- Vision AI: webcam + code editor captured as frames sent to Gemini
- Browser SpeechRecognition API captures user speech as text transcript
- Countdown timer auto-ends session; curveball at halfway mark for 5+ min sessions
- AI evaluation generates scores across 5 categories
- Best moments extraction (top 3 longest user responses)
- Proctoring flags tracked per session (gaze_away, body_language, external_voice, etc.)
- Real-time body language detection: AI text scanned for keywords (looking away, distracted, fidgety, etc.) → auto-creates proctor flags
- ARIA interview flow: starts with rapport/project questions, then technical, then behavioral
- Leaderboard auto-updates after session evaluation
- Portfolio generated with "Verified Clean" anti-cheat badge
- Portfolio/Recruiter pages gated behind simple login (name+email, stored in localStorage)
- Functional share: copy link, export proof-of-work card as PNG, LinkedIn share
- Recruiter dashboard with search, verified-only filter, shortlist/selection, highlight modal, and full transcript viewer

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provisioned by Replit)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini API proxy URL
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini API key (managed by Replit)
- `Gemini_API_Key` — Direct Gemini API key (injected to frontend via VITE_GEMINI_API_KEY)
- `PORT` — Server port (auto-assigned)

## Deployment

- `Dockerfile.api` — API server builds to Cloud Run, port 8080
- `Dockerfile.web` — Frontend builds to nginx, port 8080
- `deploy-gcp.sh` — Automated GCP Cloud Run deploy script
- Docker not available in Replit — deploy from local machine or Cloud Build trigger
