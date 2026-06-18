# StudyPilot — Comprehensive Project Status Document

> **Generated:** June 18, 2026  
> **Analysis basis:** Full static analysis of `studypilot-app` (frontend) and `studypilot-backend` (backend) source trees.  
> All statuses are derived **only from actual code present in the repository**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Architecture](#2-current-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Implemented Features](#4-implemented-features)
5. [Frontend Status](#5-frontend-status)
6. [Backend Status](#6-backend-status)
7. [Database Status](#7-database-status)
8. [AI Features](#8-ai-features)
9. [Known Issues](#9-known-issues)
10. [Remaining Tasks](#10-remaining-tasks)
11. [Development Roadmap](#11-development-roadmap)
12. [Setup Instructions](#12-setup-instructions)
13. [Deployment Status](#13-deployment-status)
14. [Handover Notes](#14-handover-notes)
15. [Complete Product Feature Inventory](#15-complete-product-feature-inventory)
16. [Summary Metrics & Priorities](#16-summary-metrics--priorities)

---

## 1. Project Overview

### What the project does

**StudyPilot** is an AI-powered academic study assistant platform. It allows students to upload learning material (PDF, text notes, YouTube lecture links), and the system automatically generates comprehensive structured study content: summaries, flashcards, multiple-choice quizzes, and revision sheets — all powered by a Large Language Model (Groq / LLaMA-3.1). Students can then practice quizzes, review flashcards with spaced repetition, ask doubts about their notes via RAG (Retrieval-Augmented Generation), get an AI-generated study schedule, track their performance analytics, and export reports to PDF.

### Main Goals and Objectives

- Eliminate the manual effort of creating study guides, flashcards, and quizzes from raw notes.
- Provide data-driven learning insights: quiz performance trends, weak topic detection, exam readiness scoring, and score prediction.
- Help students manage their study schedule intelligently using AI-suggested plans.
- Persist the full learning history (quiz attempts, flashcard reviews, planner sessions, doubts) for long-term improvement tracking.

### Target Users

- University / college students preparing for exams.
- Self-learners watching YouTube tutorials or working from PDF textbooks.
- Anyone who wants to convert raw educational material into an interactive study experience.

---

## 2. Current Architecture

### Frontend Technologies

| Technology | Version | Role |
|---|---|---|
| React | 19.2 | UI framework |
| TypeScript | ~6.0 | Type safety |
| Vite | 8.0 | Build tool & dev server |
| React Router DOM | 7.18 | Client-side routing |
| TailwindCSS | 3.4 | Utility-first CSS framework |
| Axios | 1.18 | HTTP client |
| Lucide React | 1.20 | Icon system |
| Material Symbols (Google Fonts CDN) | — | Additional icon set |

### Backend Technologies

| Technology | Version | Role |
|---|---|---|
| Node.js + Express | 4.19 | REST API server |
| TypeScript | 5.4 | Type safety |
| Prisma ORM | 5.12 | Database access layer |
| ts-node-dev | 2.0 | Dev hot-reload |
| jsonwebtoken | 9.0 | JWT authentication |
| bcrypt | 5.1 | Password hashing |
| multer | 1.4 | File upload middleware |
| zod | 4.4 | Request schema validation |
| pdfkit | 0.19 | PDF generation (export feature) |

### Database

- **MySQL** (relational, accessed via Prisma ORM)
- Connection string configured via `DATABASE_URL` environment variable
- Schema defined in `studypilot-backend/prisma/schema.prisma`

### AI Integrations

| Integration | Library | Role |
|---|---|---|
| **Groq (LLaMA-3.1-8b-instant)** | `groq-sdk ^1.2.1` | Study guide generation, planner suggestions, resource suggestions, doubt answering |
| **Xenova/transformers (MiniLM-L6-v2)** | `@xenova/transformers ^2.17.2` | Local sentence embeddings for RAG vector store |
| **pdf-parse** | `pdf-parse ^2.4.5` | PDF text extraction |
| **youtube-transcript** | `youtube-transcript ^1.3.1` | YouTube captions extraction |

### External APIs and Services

| Service | Purpose | Status |
|---|---|---|
| Groq API | LLM inference (guide generation, chat, planner) | ✅ Integrated |
| YouTube Transcript API | YouTube captions for study guides | ✅ Integrated |
| Google Fonts CDN | Material Symbols icons and typography | ✅ Integrated (frontend) |
| OpenAI API | Listed in env.example, no code integration found | ❌ Not implemented |
| Gemini API | Listed in env.example, no code integration found | ❌ Not implemented |

---

## 3. Folder Structure

```
StudyPilot/
├── studypilot-app/                  ← React TypeScript frontend
│   ├── index.html                   ← App entry HTML
│   ├── vite.config.ts               ← Vite build config
│   ├── tailwind.config.js           ← TailwindCSS theme (custom tokens)
│   ├── tsconfig.json                ← TypeScript config
│   └── src/
│       ├── App.tsx                  ← Root router and route definitions
│       ├── main.tsx                 ← React DOM entry point
│       ├── index.css                ← Global styles, CSS tokens, animations
│       ├── config/
│       │   └── api.ts               ← API base URL constant
│       ├── lib/
│       │   ├── axios.ts             ← Axios instance with JWT interceptor
│       │   └── utils.ts             ← Shared utility functions
│       ├── services/                ← API service layer (frontend)
│       │   ├── auth.service.ts      ← Login, signup, logout (JWT storage)
│       │   ├── guide.service.ts     ← CRUD for guides
│       │   ├── analytics.service.ts ← Overview stats, quiz trends, weak topics, predictor
│       │   ├── upload.service.ts    ← File upload to backend
│       │   └── user.service.ts      ← Profile update
│       ├── components/
│       │   └── layout/
│       │       ├── DashboardLayout.tsx ← Auth guard + shared layout shell
│       │       ├── Sidebar.tsx         ← Left nav sidebar
│       │       └── TopBar.tsx          ← Top header bar
│       └── pages/
│           ├── LandingPage.tsx      ← Public marketing/hero page
│           ├── LoginPage.tsx        ← User login form
│           ├── SignUpPage.tsx       ← User registration form
│           ├── DashboardPage.tsx    ← Main analytics dashboard
│           ├── CreateGuidePage.tsx  ← Guide creation (PDF/YouTube/Notes)
│           ├── MyGuidesPage.tsx     ← Guide library list
│           ├── GuideDetailsPage.tsx ← Study workspace (Summary/Flashcards/Quiz/Revision tabs)
│           ├── HistoryPage.tsx      ← Static UI mockup (not connected to API)
│           └── SettingsPage.tsx     ← Profile & preferences settings
│
└── studypilot-backend/              ← Node.js TypeScript backend
    ├── .env                         ← Active env config (not committed)
    ├── .env.example                 ← Template for required env variables
    ├── prisma/
    │   └── schema.prisma            ← Full MySQL database schema (18 models/enums)
    ├── uploads/                     ← File upload storage directory
    ├── data/                        ← RAG vector store JSON index files
    └── src/
        ├── index.ts                 ← Server entry point (starts Express on PORT)
        ├── app.ts                   ← Express app setup (CORS, middleware, routes)
        ├── config/
        │   ├── env.ts               ← Environment variable parsing
        │   └── db.ts                ← Prisma client singleton
        ├── middleware/
        │   ├── authGuard.ts         ← JWT verification middleware
        │   ├── errorHandler.ts      ← Global error handler
        │   ├── rateLimiter.ts       ← In-memory per-user Groq RPM limiter
        │   └── upload.ts            ← Multer config (25MB, PDF/image)
        ├── routes/                  ← Express route definitions (two versions)
        │   ├── auth.routes.ts       ← POST /signup, POST /login, GET /me
        │   ├── guide.routes.ts      ← Guide CRUD + generate/pdf,notes,youtube
        │   ├── upload.routes.ts     ← POST /upload
        │   ├── flashcard.routes.ts  ← (legacy) flashcard routes
        │   ├── quiz.routes.ts       ← (legacy) quiz routes
        │   ├── studyplan.routes.ts  ← (legacy) study plan routes
        │   ├── chat.routes.ts       ← (legacy) chat routes
        │   ├── user.routes.ts       ← GET /me, PUT /me
        │   └── v1/                  ← Versioned API v1
        │       ├── index.ts         ← v1 router aggregator
        │       ├── flashcard.routes.ts  ← SM-2, due cards, stats, reset
        │       ├── quiz.routes.ts   ← Submit attempt, get attempts, best score
        │       ├── planner.routes.ts    ← CRUD planner sessions + AI suggest
        │       ├── analytics.routes.ts  ← Overview, trends, heatmap, readiness
        │       ├── history.routes.ts    ← Activity logs, quiz history, flashcard history
        │       ├── resources.routes.ts  ← CRUD resources + AI suggestions
        │       ├── doubt.routes.ts  ← RAG-based doubt Q&A
        │       └── export.routes.ts ← PDF export for guide/quiz/analytics reports
        ├── controllers/             ← Business logic per feature
        │   ├── auth.controller.ts   ← signup, login, getMe
        │   ├── guide.controller.ts  ← Guide CRUD + generation endpoints
        │   ├── flashcard.controller.ts ← SM-2 spaced repetition logic
        │   ├── quiz.controller.ts   ← Quiz attempt submission + evaluation
        │   ├── planner.controller.ts   ← Planner CRUD + Groq schedule suggestion
        │   ├── analytics.controller.ts ← All analytics computations
        │   ├── history.controller.ts   ← Activity + quiz + flashcard history
        │   ├── resource.controller.ts  ← Resource CRUD + AI suggestions
        │   ├── doubt.controller.ts     ← RAG doubt answering
        │   ├── export.controller.ts    ← PDF generation with pdfkit
        │   ├── profile.controller.ts   ← User profile update
        │   └── upload.controller.ts    ← File upload handling
        ├── services/                ← Core service/business logic
        │   ├── groqService.ts       ← Groq LLM wrapper with retry logic
        │   ├── guideGenerationService.ts ← Full AI guide generation pipeline
        │   ├── extractionService.ts ← PDF, Notes, YouTube text extraction
        │   ├── sm2.service.ts       ← SuperMemo-2 spaced repetition algorithm
        │   ├── evaluator.service.ts ← Quiz attempt scoring engine
        │   ├── weakTopic.service.ts ← Weak topic detection from quiz results
        │   ├── readiness.service.ts ← Composite exam readiness score (weighted)
        │   ├── predictor.service.ts ← Linear regression score predictor
        │   ├── pdf.service.ts       ← pdfkit PDF streaming helpers
        │   ├── cacheService.ts      ← In-memory guide cache (5-min TTL)
        │   └── upload.service.ts    ← File save/delete on disk
        ├── lib/
        │   └── vectorStore.ts       ← Local JSON-file RAG vector store with MiniLM embeddings
        ├── types/                   ← TypeScript type declarations
        ├── utils/                   ← JWT helpers, hashing, API response builder, text cleaner
        └── validators/              ← Zod schemas for request body validation
```

---

## 4. Implemented Features

### 4.1 Authentication System

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Full JWT-based auth. Password hashed with bcrypt (12 rounds). Token stored in localStorage. DashboardLayout acts as auth guard that redirects unauthenticated users to /login. |
| **Files** | `auth.controller.ts`, `auth.routes.ts`, `authGuard.ts`, `auth.service.ts` (frontend), `LoginPage.tsx`, `SignUpPage.tsx`, `DashboardLayout.tsx` |

### 4.2 AI Study Guide Generation Pipeline

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Full pipeline: extract text from source (PDF/notes/YouTube) → sanitize → truncate to 12,000 chars → send to Groq LLaMA-3.1-8b-instant → parse/validate JSON → persist guide + flashcards + quiz + revision sheet in a DB transaction → async index in RAG vector store. Supports caching by source hash so the same content is never regenerated. Background processing with status tracking (pending → processing → completed/failed). |
| **Files** | `guideGenerationService.ts`, `groqService.ts`, `extractionService.ts`, `guide.controller.ts`, `CreateGuidePage.tsx` |

### 4.3 Flashcard System (SM-2 Spaced Repetition)

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / 🟡 Partial (Frontend) |
| **Description** | Backend: Full SuperMemo-2 algorithm implemented. Cards are stored per guide. Per-user review state (ease factor, interval, repetitions, nextReviewAt) stored in `flashcard_reviews`. Endpoints: get cards by guide, get due cards, submit review (upsert SM-2 state), get stats, reset progress. Frontend: Basic flashcard viewer with flip animation in GuideDetailsPage — but NO SM-2 quality rating UI (no "Easy/Good/Hard" buttons), scores are not submitted back to backend. |
| **Files** | `sm2.service.ts`, `flashcard.controller.ts`, `v1/flashcard.routes.ts`, `GuideDetailsPage.tsx` |

### 4.4 AI Quiz System

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / 🟡 Partial (Frontend) |
| **Description** | Backend: Quiz questions (MCQ, 4 options) auto-generated during guide creation. Full attempt submission with evaluator, per-question result tracking, score %, time tracking, weak topic refresh, activity logging, study session logging. History, best score, recent attempts endpoints. Frontend: Local quiz in GuideDetailsPage — works as practice session but does NOT submit results to the `/api/v1/quiz/:id/attempt` endpoint. No score persistence from frontend. |
| **Files** | `quiz.controller.ts`, `evaluator.service.ts`, `v1/quiz.routes.ts`, `GuideDetailsPage.tsx` |

### 4.5 AI Learning Analytics

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Backend: Overview stats (total guides, quiz avg, flashcards mastered, streaks, study minutes). Quiz performance trend (line chart data). Topic heatmap (per-topic accuracy). Weak topic detection (accuracy <60%). Activity calendar. Exam readiness composite score (40% quiz accuracy, 25% card mastery, 20% study consistency, 15% topic coverage). Linear regression score predictor. Per-guide summary endpoint. Frontend: Dashboard fully connected to analytics APIs; renders SVG quiz trend chart, weak topics list, AI score predictor with guide/date selector. |
| **Files** | `analytics.controller.ts`, `readiness.service.ts`, `predictor.service.ts`, `weakTopic.service.ts`, `analytics.service.ts`, `DashboardPage.tsx` |

### 4.6 RAG-Based AI Doubt Solver

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / ❌ Not Connected (Frontend) |
| **Description** | Backend: After guide generation, content is chunked (500 words, 50-word overlap) and embedded using Xenova MiniLM-L6-v2, stored as local JSON files in `./data/`. On doubt question: embed query, cosine-similarity retrieval of top-5 chunks, inject as context into Groq prompt, answer stored in `doubt_sessions` table. Auto-reindex fallback if JSON file is missing. Frontend: No doubt/chat UI exists in any current page. |
| **Files** | `vectorStore.ts`, `doubt.controller.ts`, `v1/doubt.routes.ts` |

### 4.7 AI Study Planner

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / ❌ Not Connected (Frontend) |
| **Description** | Backend: CRUD for planner sessions (topic, duration, type: STUDY/REVIEW/QUIZ/FLASHCARDS/DOUBT, status: PENDING/COMPLETED/SKIPPED). AI `suggest` endpoint takes guideId + examDate → generates a 7-day personalized plan via Groq, weighted toward weak topics. Upcoming sessions endpoint (next 7 days). Status update to COMPLETED auto-creates a StudySession activity. Frontend: No planner UI page exists. |
| **Files** | `planner.controller.ts`, `v1/planner.routes.ts` |

### 4.8 Resource Hub (AI Resource Suggestions)

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / ❌ Not Connected (Frontend) |
| **Description** | Backend: CRUD for saved resources (title, url, type: VIDEO/ARTICLE/PAPER/BOOK/COURSE/TOOL/OTHER, topic, notes, guideId). AI `suggest` endpoint takes a topic → Groq generates 3-5 real external resource recommendations. Filter by guideId/topic. Frontend: `/resources` route reuses `MyGuidesPage.tsx` component — the resource hub is a stub with no functionality. |
| **Files** | `resource.controller.ts`, `v1/resources.routes.ts` |

### 4.9 History System

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / ❌ Not Connected (Frontend) |
| **Description** | Backend: Full activity log (QUIZ_ATTEMPT, FLASHCARD_REVIEW, DOUBT_ASKED, GUIDE_VIEWED, PLANNER_SESSION), study session history, quiz attempt history, flashcard review history, clear all history endpoint. Frontend: `HistoryPage.tsx` is entirely static mock data with hardcoded values — not connected to any API. |
| **Files** | `history.controller.ts`, `v1/history.routes.ts`, `HistoryPage.tsx` |

### 4.10 PDF Export System

| Item | Detail |
|---|---|
| **Status** | ✅ Completed (Backend) / ❌ Not Connected (Frontend) |
| **Description** | Backend: Three PDF export endpoints via pdfkit — (1) full guide report (readiness score, weak topics table, flashcard mastery, quiz performance, concept outline), (2) per-quiz-attempt detailed breakdown (question-by-question with answer colors), (3) full user analytics summary PDF. Frontend: No export buttons exist in any page. |
| **Files** | `export.controller.ts`, `pdf.service.ts`, `v1/export.routes.ts` |

### 4.11 Settings / Profile Management

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Settings page has 3 tabs: Account Profile (update name + avatar URL via API), Study Preferences (readiness threshold, session duration, AI tone — stored in localStorage), Diagnostics (backend health check via GET /api/health). Profile update reflected in sidebar without page reload. |
| **Files** | `SettingsPage.tsx`, `profile.controller.ts`, `user.routes.ts`, `user.service.ts` |

### 4.12 Guide Library (My Guides)

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Displays all user guides with status (processing/ready/failed), source type, subject, flashcard/quiz counts. Supports search and delete. Links to study workspace. |
| **Files** | `MyGuidesPage.tsx`, `guide.controller.ts`, `guide.service.ts` |

### 4.13 Rate Limiting

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | In-memory per-user sliding-window rate limiter (default 25 RPM, configurable). Applied to Groq-powered endpoints. Returns 429 with retry-after seconds. |
| **Files** | `rateLimiter.ts` |

### 4.14 In-Memory Caching

| Item | Detail |
|---|---|
| **Status** | ✅ Completed |
| **Description** | Simple Map-based guide cache with 5-minute TTL. Applied to `GET /api/guides/:id`. Cache is invalidated on update/delete. |
| **Files** | `cacheService.ts` |

---

## 5. Frontend Status

### Completed Pages

| Page | Route | API Connected | Notes |
|---|---|---|---|
| LandingPage | `/` | ❌ Static | Full marketing page, no API calls |
| LoginPage | `/login` | ✅ Yes | Full auth flow |
| SignUpPage | `/signup` | ✅ Yes | Full auth flow |
| DashboardPage | `/dashboard` | ✅ Yes | Analytics, guides, predictor connected |
| CreateGuidePage | `/guides/new` | ✅ Yes | PDF/YouTube/Notes creation working |
| MyGuidesPage | `/guides` | ✅ Yes | Guide list, delete working |
| GuideDetailsPage | `/guides/:id` | 🟡 Partial | Study workspace connected; quiz/flashcard results NOT submitted to backend |
| HistoryPage | `/history` | ❌ Static | Entirely hardcoded mock data |
| SettingsPage | `/settings` | ✅ Yes | Profile + preferences working |
| ResourcesPage | `/resources` | ❌ Stub | Reuses MyGuidesPage, not a real resources page |

### Completed Components

| Component | Description |
|---|---|
| `DashboardLayout` | Shared layout with auth guard, user context |
| `Sidebar` | Navigation sidebar with active state, logout |
| `TopBar` | Top navigation bar with user avatar, breadcrumb area |

### UI Features Implemented

- ✅ Glassmorphism card design system
- ✅ Material Symbols icon set integration
- ✅ SVG quiz trend chart (custom, no third-party chart lib)
- ✅ Flashcard flip animation (CSS 3D transform)
- ✅ Quiz option selection with correct/incorrect colour feedback
- ✅ AI guide generation progress animation
- ✅ File upload with progress indicator
- ✅ Responsive sidebar layout
- ✅ Loading spinners for async operations
- ✅ Error state displays
- ✅ Empty state displays
- ✅ TailwindCSS with custom design tokens (Material Design 3 colour system)

### Missing Frontend Work

- ❌ **AI Doubt Solver / Chat UI** — no page or component exists
- ❌ **Study Planner UI** — no page or component exists
- ❌ **Resource Hub** — `/resources` is a stub, resource features not built
- ❌ **History Page API integration** — page exists but is fully mocked
- ❌ **SM-2 flashcard rating UI** — no quality rating in GuideDetailsPage
- ❌ **Quiz backend submission** — quiz in GuideDetailsPage is local-only; backend attempt endpoint not called
- ❌ **PDF export UI** — no download buttons connected to export endpoints
- ❌ **Analytics calendar heatmap** — backend endpoint exists, no frontend rendering
- ❌ **Per-guide analytics view** — backend `/analytics/guide-summary/:id` endpoint exists, not shown in frontend
- ❌ **Notifications system** — no notification UI or logic anywhere
- ❌ **Gamification / XP / Badges** — History page shows 2 hardcoded badges but no real system
- ❌ **Guide guide regeneration UI** — no "regenerate" button in GuideDetailsPage
- ❌ **Auth route protection** — DashboardLayout reads token from localStorage but does not verify expiry against server
- ❌ **Password reset flow** — no `/forgot-password` page or API

---

## 6. Backend Status

### Implemented APIs

#### Auth Routes (`/api/auth/`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email + password |
| GET | `/api/auth/me` | Get authenticated user profile |

#### Guide Routes (`/api/guides/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/guides` | List all user guides (with pagination) |
| POST | `/api/guides` | Create guide record + trigger async AI generation |
| GET | `/api/guides/:id` | Get single guide with full content (cached) |
| PUT | `/api/guides/:id` | Update guide metadata |
| DELETE | `/api/guides/:id` | Delete guide + cascade |
| POST | `/api/guides/generate/pdf` | Sync generate from uploaded PDF |
| POST | `/api/guides/generate/notes` | Sync generate from pasted notes |
| POST | `/api/guides/generate/youtube` | Sync generate from YouTube URL |
| GET | `/api/guides/:id/flashcards` | Get flashcards for guide |
| GET | `/api/guides/:id/quiz` | Get quiz questions for guide |
| GET | `/api/guides/:id/revision` | Get revision sheet |

#### Upload Routes (`/api/upload/`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Upload PDF/image file and trigger guide generation |

#### User Routes (`/api/users/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get user profile |
| PUT | `/api/users/me` | Update name / avatarUrl |

#### V1 Routes (`/api/v1/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/flashcards/:guideId` | Get all flashcards for guide with SM-2 state |
| GET | `/api/v1/flashcards/due` | Get all due-for-review cards (across all guides) |
| POST | `/api/v1/flashcards/:cardId/review` | Submit SM-2 review (quality 0-5) |
| GET | `/api/v1/flashcards/:guideId/stats` | Mastered/learning/new card counts |
| POST | `/api/v1/flashcards/:guideId/reset` | Reset all flashcard progress for guide |
| POST | `/api/v1/quiz/:quizId/attempt` | Submit quiz attempt with results |
| GET | `/api/v1/quiz/:quizId/attempts` | Get all attempts for a guide's quiz |
| GET | `/api/v1/quiz/attempt/:attemptId` | Get detailed attempt breakdown |
| GET | `/api/v1/quiz/:quizId/best` | Get best score for a quiz |
| GET | `/api/v1/quiz/recent` | Get 10 most recent quiz attempts |
| GET/POST/PUT/DELETE | `/api/v1/planner` | Planner session CRUD |
| GET | `/api/v1/planner/upcoming` | Sessions in next 7 days |
| GET | `/api/v1/planner/suggest` | AI-generated 7-day study plan |
| GET | `/api/v1/analytics/overview` | High-level stats |
| GET | `/api/v1/analytics/quiz-trend` | Quiz score trend chart data |
| GET | `/api/v1/analytics/topic-heatmap` | Per-topic accuracy heatmap |
| GET | `/api/v1/analytics/weak-topics` | Topics with accuracy <60% |
| GET | `/api/v1/analytics/activity-calendar` | Daily activity calendar data |
| GET | `/api/v1/analytics/predict` | Linear regression score prediction |
| GET | `/api/v1/analytics/guide-summary/:id` | Full per-guide analytics |
| GET | `/api/v1/history` | Paginated activity log |
| GET | `/api/v1/history/sessions` | All study sessions |
| GET | `/api/v1/history/quiz-attempts` | Paginated quiz history |
| GET | `/api/v1/history/flashcard-reviews` | All flashcard review history |
| DELETE | `/api/v1/history/clear` | Delete all history |
| GET/POST/PUT/DELETE | `/api/v1/resources` | Resource CRUD |
| GET | `/api/v1/resources/guide/:guideId` | Resources for a guide |
| POST | `/api/v1/resources/suggest` | AI resource suggestions for a topic |
| POST | `/api/v1/doubt/ask` | RAG-based doubt Q&A |
| GET | `/api/v1/doubt/history/:guideId` | Doubt session history |
| POST | `/api/v1/doubt/index/:guideId` | Manually re-index guide for RAG |
| GET | `/api/v1/export/guide/:guideId` | Export guide report as PDF |
| GET | `/api/v1/export/quiz/:attemptId` | Export quiz attempt as PDF |
| GET | `/api/v1/export/analytics` | Export full analytics as PDF |
| GET | `/api/health` | Health check |

### Authentication Status

✅ **Fully implemented.** JWT (HS256) issued on login/signup, verified by `authGuard.ts` middleware on all protected routes. No refresh token mechanism — 7-day expiry, user must re-login after.

### Database Status

✅ **Fully migrated and operational.** MySQL with Prisma ORM. All 18 models defined in schema. See [Section 7](#7-database-status) for full table list.

### AI Integration Status

✅ **Groq (primary AI)** — fully integrated for guide generation, planner suggest, resource suggest, doubt answering.  
✅ **Xenova/transformers (RAG)** — local embeddings for doubt Q&A vector store.  
❌ **OpenAI** — key in env.example only, zero code usage.  
❌ **Gemini** — key in env.example only, zero code usage.

### Missing Backend Work

- ❌ **Refresh token / token rotation** — JWT is single-use 7-day token; no refresh mechanism
- ❌ **Password reset email flow** — no `/forgot-password` or `/reset-password` endpoint
- ❌ **Email verification** — signup creates account immediately without email confirmation
- ❌ **True/False or Short Answer quiz types** — only MCQ (4 options) is implemented; Groq prompt hardcodes this
- ❌ **Gamification / XP / Level / Streak badge system** — no backend models or controllers exist
- ❌ **Admin API** — no admin user role, no admin routes
- ❌ **Notifications / Push** — no notification model, no push endpoint
- ❌ **Persistent Redis/external cache** — cache is in-process `Map`, lost on restart
- ❌ **File cleanup** — uploaded PDF files are never deleted from disk after processing
- ❌ **DOCX / PPT upload** — only PDF and image MIME types are accepted by multer

---

## 7. Database Status

### Existing Tables / Collections

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | id, name, email, password_hash, avatar_url | User accounts |
| `guides` | id, user_id, title, source_type (pdf/notes/youtube), status (pending/processing/completed/failed) | Study guide records |
| `guide_content` | guide_id (unique), raw_content, cleaned_content, short_summary, detailed_summary, key_concepts (JSON), topics (JSON), topic_hierarchy (JSON), metadata (JSON) | AI-generated guide content |
| `uploaded_files` | id, user_id, guide_id, stored_name, mime_type, file_type, extracted_text | Uploaded file tracking |
| `flashcards` | id, guide_id, question, answer, difficulty, order_index | AI-generated flashcards |
| `flashcard_reviews` | user_id + card_id (unique), ease_factor, interval_days, repetitions, next_review_at | SM-2 spaced repetition state |
| `quiz_questions` | id, guide_id, question, options (JSON), correct_answer_index, explanation | MCQ quiz questions |
| `quiz_attempts` | id, user_id, quiz_id (=guide_id), score, total_questions, correct, incorrect, skipped, time_taken_sec | Quiz attempt records |
| `quiz_results` | attempt_id, question_id, selected_opt, is_correct | Per-question results |
| `revision_sheets` | id, guide_id (unique), title | Revision sheet header |
| `revision_sections` | id, revision_sheet_id, heading, bullet_points (JSON) | Revision sheet sections |
| `study_plans` | id, guide_id (unique), plan_json, start_date, end_date | AI study plan |
| `study_sessions` | id, user_id, guide_id, duration_secs, activity_type (reading/flashcards/quiz/notes/chat/doubt/planner) | Activity time tracking |
| `messages` | id, user_id, guide_id, role (user/assistant), content | Chat/RAG message history |
| `planner_sessions` | id, user_id, guide_id, topic, scheduled_at, duration_minutes, type (STUDY/REVIEW/QUIZ/FLASHCARDS/DOUBT), status (PENDING/COMPLETED/SKIPPED) | Study planner sessions |
| `doubt_sessions` | id, user_id, guide_id, question, answer | RAG doubt Q&A records |
| `resources` | id, user_id, guide_id, title, url, type (VIDEO/ARTICLE/PAPER/BOOK/COURSE/TOOL/OTHER), topic, notes | Saved learning resources |
| `activity_log` | id, user_id, guide_id, type (QUIZ_ATTEMPT/FLASHCARD_REVIEW/DOUBT_ASKED/GUIDE_VIEWED/PLANNER_SESSION), description, meta (JSON) | Global activity events |
| `weak_topics` | id, guide_id, topic_name, score, recommendation | Detected weak topics from quiz analysis |
| `guide_topics` | guide_id + topic (unique) | Topic coverage tracking |

### Relationships (Key)

- `User` → has many `Guide`, `UploadedFile`, `StudySession`, `Message`, `FlashcardReview`, `QuizAttempt`, `PlannerSession`, `DoubtSession`, `Resource`, `ActivityLog`
- `Guide` → has one `GuideContent`, `RevisionSheet`, `StudyPlan` (all unique FK); has many `Flashcard`, `QuizQuestion`, `WeakTopic`, `GuideTopic`
- `Flashcard` → has many `FlashcardReview` (per user)
- `QuizAttempt` → has many `QuizResult`
- `RevisionSheet` → has many `RevisionSection`
- All user-owned records cascade-delete on user deletion. Guide-owned records cascade-delete on guide deletion.

### Pending Schema Changes

- ❌ No `UserPreferences` model (study preferences are localStorage-only in frontend)
- ❌ No `Notification` model
- ❌ No `Badge` or `Achievement` model
- ❌ No `PasswordResetToken` model
- ❌ `messages` table exists but the chat route (`/api/chat`) code is not fully visible; the Messages model may be partially unused vs. the `doubt_sessions` model

---

## 8. AI Features

### Implemented AI Workflows

#### 1. Study Guide Generation Pipeline
- **Trigger:** POST `/api/guides/generate/{pdf|notes|youtube}` or async via POST `/api/guides`
- **Flow:** Source text extraction → sanitize → truncate to 12,000 chars → Groq LLaMA-3.1-8b-instant → JSON parse/validate → DB transaction (guide + content + flashcards + quiz questions + revision sheet) → async RAG index
- **Output:** Structured JSON with shortSummary, detailedSummary, cleanedContent, keyConcepts[], topics[], topicHierarchy[], metadata, flashcards[10], quizQuestions[5], revisionSheet{}
- **Caching:** MD5 hash of source content used as deduplication key per user

#### 2. RAG-Based Doubt Answering
- **Model:** Xenova/all-MiniLM-L6-v2 (local, no API cost) for embeddings + Groq LLaMA for generation
- **Flow:** Chunk guide text (500-word chunks, 50-word overlap) → embed → store as JSON file → on query: embed question → cosine similarity → top-5 chunks → Groq prompt → answer saved in DB
- **Fallback:** Auto-reindex from DB if JSON file is missing

#### 3. AI Study Planner Suggestion
- **Flow:** Get weak topics + readiness score + topics list → Groq prompt with 7-day personalized schedule request → parse JSON → return daily sessions with type distribution
- **Model:** Groq LLaMA-3.1-8b-instant

#### 4. AI Resource Suggestions
- **Flow:** Topic + guide context → Groq prompt for 3-5 external resource recommendations → return with URL, type, reason
- **Model:** Groq LLaMA-3.1-8b-instant

#### 5. Exam Readiness Score (Algorithmic, not LLM)
- **Algorithm:** Weighted composite score (quiz accuracy 40%, card mastery 25%, study consistency 20%, topic coverage 15%)
- **Thresholds:** ≥85 = Ready (green), ≥70 = On Track (indigo), ≥50 = Needs Work (orange), <50 = At Risk (red)

#### 6. Exam Score Predictor (Algorithmic, not LLM)
- **Algorithm:** Linear regression on quiz attempt scores + 70/30 blend with readiness index → projected score on exam date
- **Confidence:** high (≥5 attempts), medium (≥3), low (<3)

### Models Being Used

| Model | Provider | API Type | Usage |
|---|---|---|---|
| `llama-3.1-8b-instant` | Groq | Remote REST API | All LLM tasks |
| `Xenova/all-MiniLM-L6-v2` | HuggingFace (via @xenova/transformers) | Local inference | Sentence embeddings for RAG |

### Prompt Pipelines

1. **Guide Generation:** Strict JSON-only system prompt + structured user prompt with exact field requirements. Exponential backoff retry (max 3 attempts, 2s/4s delays).
2. **Doubt Answering:** Academic tutor persona, context injection, Markdown formatting requested.
3. **Study Planner:** Coach persona, weak topics + readiness context, strict JSON output.
4. **Resource Suggestion:** Resource finder persona, known-URL constraint, strict JSON.

### Missing AI Functionality

- ❌ **True/False or Short Answer question generation** — only MCQ hardcoded in Groq prompt
- ❌ **Difficulty level selection for guide** — content always processed at same temperature/length
- ❌ **Study time estimation per topic** — not computed
- ❌ **OCR for image-based PDFs** — `pdf-parse` only handles text PDFs; image PDFs return an error
- ❌ **DOCX/PPT upload support** — no extraction service for these formats
- ❌ **Voice/audio notes processing** — not implemented
- ❌ **Multi-language support** — Groq prompt is English-only
- ❌ **Streaming responses** — all Groq calls are blocking (no SSE streaming)

---

## 9. Known Issues

### Bugs

1. **Quiz results not persisted from frontend** — `GuideDetailsPage` has a local-state quiz that scores the user but never calls `POST /api/v1/quiz/:id/attempt`. This means quiz history, weak topics, and streak tracking don't update from the main study workspace.

2. **SM-2 flashcard reviews not submitted from frontend** — The flashcard viewer has no quality rating buttons (0-5). SM-2 progress is never submitted. The backend endpoint exists but is unreachable from the current UI.

3. **HistoryPage is entirely mocked** — All stats, activity timeline, streak heatmap, and badges use hardcoded fake data.

4. **Resources route renders wrong component** — `/resources` maps to `<MyGuidesPage />` (see `App.tsx` line 29), showing the guide library instead of a resources UI.

5. **Sidebar brand name mismatch** — Sidebar displays "ScholarStudy" (hardcoded in `Sidebar.tsx` line 45) while the product is called "StudyPilot."

6. **CreateGuidePage recent guides are hardcoded** — The "Recently Created Guides" section in `CreateGuidePage.tsx` uses static mock data (Calculus II, Database Systems, Organic Chemistry).

7. **Study preferences not synced to backend** — Readiness threshold, session duration, and AI tone are stored only in `localStorage` with no corresponding backend model, so preferences are lost on new devices.

8. **File upload without guide generation trigger for PDF route** — `CreateGuidePage` calls `guideService.create()` first (which triggers async non-PDF generation) then `uploadService.uploadFile()`. For PDF type, the async guide generation in the create call should be skipped but relies on `sourceType !== 'pdf'` check in the controller — this is correct but the frontend passes `sourceType: 'pdf'` through the form body. Worth validating this edge case end-to-end.

9. **In-memory cache and rate limiter lost on server restart** — Both use `Map` objects in process memory. Suitable for development; not suitable for production or multi-instance deployments.

10. **RAG vector store is file-system based** — Vector index JSON files stored in `./data/` directory. Not scalable; files could become large and are not cleaned up if a guide is deleted.

### Technical Debt

- No automated tests (unit, integration, or e2e) exist anywhere in the codebase.
- Duplicate route files exist: legacy routes in `/src/routes/` (flashcard.routes.ts, quiz.routes.ts, studyplan.routes.ts, chat.routes.ts) alongside the versioned `/routes/v1/` equivalents.
- `messages` table schema exists but the chat route it was designed for appears to be legacy/unused alongside the `doubt_sessions` approach.
- Guide creation currently creates a guide record and triggers background AI in the same request. On Groq API failure, the guide stays in `processing` status indefinitely unless the status update in the catch block succeeds.
- Frontend services have no global error boundary or toast notification system — errors surface as `console.error` or inline UI messages.
- `CreateGuidePage` has static stats ("Total Guides: 24", "Study Streak: 7 Days") that are not fetched from the API.

### Performance Concerns

- Xenova MiniLM embedding model is loaded lazily and cached in process memory, but first cold-start indexing a guide can be slow (model download on first use if not cached).
- RAG retrieval reads the full JSON index file from disk on every request — for large guides this could be slow.
- `computeReadiness()` runs 5+ separate DB queries synchronously — called in the guide summary, predictor, and export endpoints. Could be batched.
- No pagination on `/api/guides` by default (pagination is optional query param); could return large datasets.
- Export analytics PDF endpoint calls `computeReadiness()` in a loop for each guide — O(n) DB queries per guide.

---

## 10. Remaining Tasks

### 🔴 High Priority

- [ ] **Connect quiz submission to backend** — Wire `GuideDetailsPage` quiz to `POST /api/v1/quiz/:id/attempt`
- [ ] **Add SM-2 quality rating UI to flashcard viewer** — Add Easy/Good/Hard/Again buttons and call `POST /api/v1/flashcards/:cardId/review`
- [ ] **Connect HistoryPage to API** — Replace mock data with calls to `/api/v1/history`, `/api/v1/history/quiz-attempts`, etc.
- [ ] **Build AI Doubt Solver UI** — Create a chat/doubt page or tab in GuideDetailsPage using `/api/v1/doubt/ask`
- [ ] **Fix sidebar brand name** — Change "ScholarStudy" to "StudyPilot" in `Sidebar.tsx`
- [ ] **Fix `/resources` route** — Create a real ResourcesPage or update App.tsx routing
- [ ] **Password reset flow** — Add forgot-password endpoint and page
- [ ] **Remove hardcoded data from CreateGuidePage** — Fetch real guide stats and recent guides from API

### 🟡 Medium Priority

- [ ] **Build Study Planner UI** — Create a planner page connected to `/api/v1/planner` endpoints
- [ ] **Add PDF export buttons** — Add download links in GuideDetailsPage and DashboardPage pointing to export endpoints
- [ ] **Analytics per-guide view** — Surface the `/api/v1/analytics/guide-summary/:id` data in GuideDetailsPage or a dedicated analytics tab
- [ ] **Activity calendar heatmap** — Render the calendar data from `/api/v1/analytics/activity-calendar`
- [ ] **Fix study preferences persistence** — Store readiness threshold/preferences in a `user_preferences` DB table
- [ ] **Auth token expiry handling** — Detect 401 responses in Axios interceptor and redirect to login
- [ ] **File cleanup on guide delete** — Delete uploaded PDF files from disk when guide is deleted
- [ ] **Guide regeneration** — Add "Regenerate" button in GuideDetailsPage that calls generate endpoints

### 🟢 Low Priority

- [ ] **Add unit tests** — Especially for `sm2.service.ts`, `evaluator.service.ts`, `readiness.service.ts`, `predictor.service.ts`
- [ ] **Add integration tests** — Test auth flow, guide generation pipeline
- [ ] **Implement gamification** — XP, levels, badges, streak tracking in backend + frontend
- [ ] **Add notifications system** — Study reminders, streak alerts (browser notifications)
- [ ] **Add DOCX/PPT support** — Add extraction services for additional file formats
- [ ] **Replace file-system RAG store** — Migrate to a proper vector database (pgvector, Pinecone, Qdrant)
- [ ] **Add Redis caching** — Replace in-memory Map cache with Redis for production
- [ ] **Email verification** — Send verification email on signup
- [ ] **Admin panel** — User management, usage stats, guide monitoring
- [ ] **Streaming AI responses** — Use SSE for real-time guide generation progress
- [ ] **Mobile responsiveness audit** — Full mobile layout review

---

## 11. Development Roadmap

### Phase 1 (Current — Core MVP)

✅ AI guide generation (PDF, Notes, YouTube)  
✅ Flashcard viewer (basic, no SM-2 submission)  
✅ Quiz practice (local, no backend submission)  
✅ Dashboard analytics (connected to APIs)  
✅ Settings / profile management  
✅ JWT authentication  
✅ Full backend API for all features  
🟡 History page (exists but mocked)  
❌ Doubt solver UI  

### Phase 2 (Near-term — Connect Everything)

- Wire quiz submission → backend (`POST /api/v1/quiz/:id/attempt`)
- SM-2 rating UI → backend (`POST /api/v1/flashcards/:cardId/review`)
- History page → real API data
- AI Doubt Solver chat UI
- Study Planner page and calendar
- Resource Hub page
- Per-guide analytics tab
- PDF export buttons
- Fix brand name, hardcoded data, and routing stubs

### Phase 3 (Mid-term — Polish & Scale)

- Password reset flow
- Email verification
- Activity calendar heatmap rendered in UI
- Gamification (XP, badges, streaks) backend models + UI
- Notifications (browser push or in-app)
- DOCX/PPT upload support
- Redis cache + multi-instance support
- File cleanup on deletion
- Auth token refresh mechanism

### Future Enhancements

- Replace file-system RAG with vector database (pgvector or Pinecone)
- Streaming AI generation progress (Server-Sent Events)
- Collaborative study groups
- Shared flashcard decks
- Mobile app (React Native or PWA)
- Browser extension for clipping web content
- OCR for image-based PDFs
- Voice notes processing (Whisper API)
- Multi-language UI and content generation
- Admin dashboard

---

## 12. Setup Instructions

### Prerequisites

- Node.js ≥ 18
- MySQL 8.0 server running locally (or remote)
- Groq API key (free tier available at console.groq.com)

### Installation Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd StudyPilot

# 2. Setup backend
cd studypilot-backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL and GROQ_API_KEY at minimum
npm install

# 3. Run Prisma migrations
npx prisma migrate dev --name init
npx prisma generate

# 4. Setup frontend
cd ../studypilot-app
npm install
```

### Required Environment Variables (Backend)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL connection string: `mysql://user:pass@localhost:3306/studypilot` |
| `JWT_SECRET` | ✅ | Strong random string (≥32 chars) for signing JWTs |
| `GROQ_API_KEY` | ✅ | Groq API key from console.groq.com |
| `PORT` | Optional | Server port (default: 5000) |
| `JWT_EXPIRES_IN` | Optional | JWT expiry duration (default: `7d`) |
| `BCRYPT_SALT_ROUNDS` | Optional | bcrypt salt rounds (default: 12) |
| `FRONTEND_ORIGIN` | Optional | CORS origin (default: `http://localhost:5173`) |
| `UPLOAD_DIR` | Optional | Upload directory path (default: `./uploads`) |
| `MAX_FILE_SIZE_MB` | Optional | Max upload size in MB (default: 25) |
| `GROQ_MODEL` | Optional | Groq model ID (default: `llama-3.1-8b-instant`) |
| `GROQ_MAX_TOKENS` | Optional | Max tokens per Groq response (default: 4096) |
| `GROQ_TEMPERATURE` | Optional | Temperature for Groq (default: 0.3) |
| `GROQ_RPM_LIMIT` | Optional | Requests per minute limit (default: 25) |
| `VECTOR_STORE_PATH` | Optional | Path for RAG JSON files (default: `./data`) |
| `OPENAI_API_KEY` | ❌ Unused | Listed in example, not integrated |
| `GEMINI_API_KEY` | ❌ Unused | Listed in example, not integrated |

### How to Run Frontend

```bash
cd studypilot-app
npm run dev
# Runs on http://localhost:5173
```

### How to Run Backend

```bash
cd studypilot-backend
npm run dev
# Runs on http://localhost:5000
```

---

## 13. Deployment Status

### What's Deployable (with effort)

- **Backend** — Express app can be deployed to any Node.js host (Railway, Render, Fly.io, EC2). Requires a managed MySQL database. Environment variables must be configured. The `./data` vector store directory must be on persistent storage (not ephemeral).
- **Frontend** — Vite build (`npm run build`) produces static assets deployable to Vercel, Netlify, or any CDN. `VITE_API_URL` must point to the deployed backend.

### What's NOT Deployable (blockers)

- ❌ **File-system vector store** — RAG data stored in `./data/*.json` won't work on ephemeral hosting (Heroku dynos, Vercel serverless functions). Requires persistent volume or migration to a vector DB.
- ❌ **In-memory cache** — Cache is lost on every restart. Fine for single-instance but not for scaled deployments.
- ❌ **Xenova model cold-start** — First guide indexing after deployment downloads the MiniLM model. On platforms with cold-start limits (Render free tier), this can time out. Model must be pre-downloaded or timeout must be increased.
- ❌ **`multer` storage to local disk** — Uploaded files are saved to `./uploads` on server disk. Not suitable for serverless or multi-instance deployments; needs S3 or similar object storage.

### Deployment Blockers Summary

1. Local filesystem dependencies (uploads, vector store) — must be replaced with cloud storage
2. In-memory caching — must be replaced with Redis
3. No production process manager (PM2, Docker) configuration exists
4. No `Dockerfile` or `docker-compose.yml` in the repository
5. No CI/CD pipeline configured

---

## 14. Handover Notes

### Important Decisions Made

1. **Single LLM (Groq LLaMA-3.1-8b-instant)** — Groq was chosen for its free tier and fast inference speed. The model is configured via env var so it can be swapped without code changes. The prompt enforces strict JSON-only output to avoid parsing issues.

2. **Local file-system RAG** — Instead of a managed vector database, RAG indices are stored as JSON files with dot-product cosine similarity. This was intentional for simplicity and zero infrastructure cost during development. It is the main scalability bottleneck for production.

3. **SM-2 Algorithm** — The full SuperMemo-2 algorithm is implemented correctly in `sm2.service.ts`. The ease factor minimum is capped at 1.3 per the SM-2 spec. Review state is per-user-per-card (not shared across users).

4. **Exam Readiness = Weighted Composite** — The readiness score formula (`40% quiz + 25% cards + 20% consistency + 15% coverage`) was designed to be balanced and fair for early users with few attempts. The weights can be tuned in `readiness.service.ts`.

5. **Two Route Versions** — There are legacy routes (`/api/guides`, `/api/flashcards`, etc.) and versioned routes (`/api/v1/`). The v1 routes are the feature-complete ones. The legacy routes handle older endpoints. Both are registered in `app.ts`. Future development should use v1 routes only.

6. **Async Background Guide Generation** — For notes and YouTube sources, `guideService.create()` immediately returns a guide in `processing` status and runs AI generation in the background via `generateGuideAsync()`. This prevents request timeouts for long-running Groq calls. The frontend is expected to poll or navigate to the guide list.

7. **Source Deduplication by Hash** — Same user uploading the same content (MD5 hash match) returns the cached guide without re-running Groq. This saves API costs.

### Assumptions

- The MySQL database is managed externally and migrations are run manually via `npx prisma migrate dev`.
- The frontend `config/api.ts` points to `http://localhost:5000` by default — this must be updated for any deployment.
- Study preferences (readiness threshold, session duration, AI tone) are intentionally localStorage-only for now, designed as a quick UX win that doesn't require a backend round-trip.
- The "Recently Created Guides" on the CreateGuidePage and all statistics there are intentionally hardcoded placeholders — these were UI mockup elements not yet wired to the API.

### Things Future Developers Should Know

1. **GuideDetailsPage quiz is local-only.** The most critical integration gap. The `handleSubmitAllQuiz()` function locally calculates score but never calls the backend. Fix: on quiz submit, call `analyticsService.submitQuizAttempt(guideId, answers)`.

2. **Flashcard SM-2 has no frontend trigger.** The backend SM-2 system is complete and correct, but no UI exists to submit quality ratings. Fix: add "Again / Hard / Good / Easy" buttons below the flashcard and call the review endpoint.

3. **Check `v1/` routes for all new feature work.** The root-level `routes/` directory has older/legacy copies. All new development should go into `src/routes/v1/` and `src/controllers/`.

4. **The `messages` table** was designed for a general chat system. Currently only `doubt_sessions` is used for AI Q&A, which duplicates intent. Future decision: either migrate doubt sessions to use the messages table, or document their separate purposes.

5. **Groq rate limit is per-user per minute** (default 25 RPM). On the free Groq tier, this is the main bottleneck if many users generate guides simultaneously. Consider queue-based processing for scale.

6. **Frontend auth guard is client-side only.** `DashboardLayout.tsx` checks for a token in localStorage, but doesn't verify if it's expired. The API will reject expired tokens with 401, but the redirect happens only after an API call fails — not proactively. Fix: decode the JWT expiry client-side on load.

---

## 15. Complete Product Feature Inventory

### Authentication & User Management

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| User Registration | ✅ Implemented | Create new account | Fill name/email/password → POST /auth/signup → JWT returned | bcrypt, prisma users |
| Login | ✅ Implemented | Authenticate user | Email + password → POST /auth/login → JWT stored in localStorage | bcrypt, JWT |
| Logout | ✅ Implemented | End session | Click logout → localStorage cleared → redirect to / | auth.service.ts |
| Password Reset | ❌ Planned | Recover access | Not implemented | Email service needed |
| JWT Authentication | ✅ Implemented | Protect API routes | Token sent in Authorization header on every request | jsonwebtoken, authGuard |
| Profile Management | ✅ Implemented | Update name/avatar | Settings → Account tab → PUT /users/me | profile.controller |
| User Preferences | 🟡 In Progress | Customize study config | Settings → Study Prefs → saved to localStorage only | No backend model |

### Dashboard

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Personalized Dashboard | ✅ Implemented | Overview of study health | Auto-loaded on /dashboard | analytics.service |
| Study Statistics | ✅ Implemented | Total guides, quiz avg, time | Displayed in 4 stat cards | /api/v1/analytics/overview |
| Learning Streaks | ✅ Implemented | Daily study streak count | Shown in stats card | study_sessions, analytics |
| Progress Tracking | ✅ Implemented | Flashcards mastered, quiz avg | Dashboard stat cards | analytics.controller |
| Recent Activity | 🟡 In Progress | Last 3 guides shown | Partial — shows guides not activity | guide.service |
| Score Predictor | ✅ Implemented | AI exam score forecast | Select guide + date → Predict → see projected % | predictor.service, analytics |

### AI Study Guide Generation

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Paste Notes | ✅ Implemented | Generate from pasted text | Create Guide → Notes tab → paste → Generate | guideGenerationService, groqService |
| PDF Upload | ✅ Implemented | Generate from PDF | Create Guide → PDF tab → upload → Generate | extractionService (pdf-parse), multer |
| YouTube Lecture Processing | ✅ Implemented | Generate from YT video | Create Guide → YouTube tab → URL → Generate | extractionService (youtube-transcript) |
| AI Guide Generation | ✅ Implemented | Full structured study content | Automatic after source input | groqService, guideGenerationService |
| Guide Saving | ✅ Implemented | Persist guide in DB | Automatic on generation | prisma, guide_content |
| Guide Regeneration | ❌ Planned | Re-run AI on same source | Not implemented — no UI trigger | Would reuse pipeline |
| DOCX Upload | ❌ Planned | Generate from Word doc | Not implemented | Needs extraction service |
| PPT Upload | ❌ Planned | Generate from PowerPoint | Not implemented | Needs extraction service |
| URL Content Processing | ❌ Planned | Generate from web article | Not implemented | Needs web scraper |

### AI Quiz Generator

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| MCQ Generation | ✅ Implemented | Auto-generate 5 MCQs | Automatic during guide generation | groqService (hardcoded in prompt) |
| True/False Questions | ❌ Planned | Alternative question type | Not implemented | Groq prompt update needed |
| Short Questions | ❌ Planned | Open-ended questions | Not implemented | Evaluator service update needed |
| Difficulty Levels | 🟡 In Progress | Per-card difficulty tag | Flashcards have easy/medium/hard tags; quiz questions don't | Schema supports it |
| Timed Quiz Mode | 🟡 In Progress | Track time taken | Backend stores time_taken_sec; frontend has no timer UI | quiz_attempts |
| Quiz History | ✅ Implemented | Past attempt records | /api/v1/history/quiz-attempts | history.controller |
| Quiz Analytics | ✅ Implemented | Topic breakdown, weak detection | Backend full; frontend not surfaced | analytics.controller, quiz.controller |

### Flashcards System

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| AI Flashcard Generation | ✅ Implemented | 10 flashcards auto-generated | Automatic during guide generation | groqService |
| Manual Flashcards | ❌ Planned | User-created cards | Not implemented | Would need new UI + endpoint |
| Spaced Repetition (SM-2) | ✅ Implemented (Backend) | Intelligent review scheduling | Backend complete; frontend has no rating UI | sm2.service, flashcard_reviews |
| Review Scheduling | ✅ Implemented (Backend) | Due card queue | /api/v1/flashcards/due endpoint complete | flashcard_reviews |
| Flashcard Analytics | ✅ Implemented (Backend) | Mastered/learning/new counts | /api/v1/flashcards/:id/stats — not surfaced in UI | flashcard.controller |

### Study Planner

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Goal Setting | ❌ Planned | Set exam goals | No UI exists | |
| Exam Date Input | ✅ Implemented (Backend) | Set exam date for planning | Via /api/v1/planner/suggest query param | planner.controller |
| Smart Schedule Generation | ✅ Implemented (Backend) | 7-day AI plan | /api/v1/planner/suggest → Groq response | groqService, planner.controller |
| Daily Study Tasks | ✅ Implemented (Backend) | Planner sessions CRUD | Full CRUD endpoint set | planner_sessions |
| Weekly Planning | ✅ Implemented (Backend) | See upcoming sessions | /api/v1/planner/upcoming | planner.controller |
| Planner UI | ❌ Planned | Frontend calendar/list view | No page exists | |

### Resource Hub

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Generated Resources Library | ❌ Planned | Browse saved resources | /resources route shows wrong page | |
| Saved Resources CRUD | ✅ Implemented (Backend) | Save/manage resources | /api/v1/resources endpoints complete | resource.controller |
| Search Resources | 🟡 In Progress | Filter by guide/topic | Backend supports ?guideId=&topic= query | resource.controller |
| AI Resource Suggestions | ✅ Implemented (Backend) | AI recommends external resources | /api/v1/resources/suggest — no frontend | resource.controller, groqService |

### AI Learning Assistant (Doubt Solver)

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Chat With Notes | ✅ Implemented (Backend) | Ask AI about guide content | /api/v1/doubt/ask — no frontend UI | doubt.controller, vectorStore |
| RAG Context Retrieval | ✅ Implemented | Retrieve relevant chunks | Cosine similarity on MiniLM embeddings | vectorStore.ts |
| Doubt History | ✅ Implemented (Backend) | Past Q&A records | /api/v1/doubt/history/:guideId | doubt_sessions |
| Doubt Chat UI | ❌ Planned | Frontend chat interface | No page or component exists | |

### Learning Analytics

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Study Time Tracking | ✅ Implemented | Track session duration | Auto-logged on quiz/flashcard/doubt activity | study_sessions |
| Quiz Performance | ✅ Implemented | Score trend chart | Dashboard → SVG chart | analytics.controller |
| Weak Topic Detection | ✅ Implemented | Topics with accuracy <60% | Dashboard weak topics list | weakTopic.service |
| Strength Analysis | 🟡 In Progress | Topics with accuracy ≥80% | Topic heatmap endpoint exists; no frontend | analytics.controller |
| Exam Readiness Score | ✅ Implemented | Composite 0-100 score | Backend computed; surfaced in export/guide-summary | readiness.service |
| Score Predictor | ✅ Implemented | Regression-based forecast | Dashboard predictor widget | predictor.service |
| Activity Calendar | ✅ Implemented (Backend) | Daily study heatmap | /api/v1/analytics/activity-calendar — no frontend | analytics.controller |

### History System

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Activity Log | ✅ Implemented (Backend) | All events paginated | /api/v1/history — HistoryPage not connected | history.controller |
| Quiz History | ✅ Implemented (Backend) | Past quiz records | /api/v1/history/quiz-attempts | history.controller |
| Flashcard History | ✅ Implemented (Backend) | Past review records | /api/v1/history/flashcard-reviews | history.controller |
| Clear History | ✅ Implemented (Backend) | Wipe all data | /api/v1/history/clear?confirm=true | history.controller |
| History UI | ❌ Mocked | Visual history page | HistoryPage.tsx uses fake hardcoded data | Needs API connection |

### Notifications

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Study Reminders | ❌ Planned | Remind to study | Not implemented | Requires notification model |
| Streak Alerts | ❌ Planned | Notify streak at risk | Not implemented | |
| Exam Alerts | ❌ Planned | Upcoming exam reminder | Not implemented | |

### Gamification

| Feature | Status | Purpose | User Flow | Dependencies |
|---|---|---|---|---|
| Badges | ❌ Planned | Achievement rewards | 2 hardcoded badges shown in HistoryPage — no system | No backend model |
| Streaks (visual) | 🟡 In Progress | Study consistency | Backend streak calculation exists; HistoryPage shows mock | analytics.controller |
| XP/Levels | ❌ Planned | Points system | Not implemented | |

### Backend Features

| Feature | Status | Notes |
|---|---|---|
| REST APIs | ✅ Implemented | 35+ endpoints |
| Authentication APIs | ✅ Implemented | Signup, login, me |
| AI Processing APIs | ✅ Implemented | Generate, doubt, planner, resources |
| File Upload APIs | ✅ Implemented | PDF + image, 25MB max |
| Database Models | ✅ Implemented | 18+ Prisma models |
| In-Memory Caching | ✅ Implemented | 5-min TTL guide cache |
| Rate Limiting | ✅ Implemented | Per-user 25 RPM Groq limiter |
| Request Validation | ✅ Implemented | Zod schemas |
| Error Handling | ✅ Implemented | Global error handler with typed errors |
| Redis Caching | ❌ Planned | Not implemented |

### Admin Features

| Feature | Status | Notes |
|---|---|---|
| User Management | ❌ Planned | No admin routes exist |
| Analytics Dashboard | ❌ Planned | No admin panel |
| Usage Tracking | ❌ Planned | Not implemented |

---

## 16. Summary Metrics & Priorities

### Feature Completion Percentage (by category)

| Category | Backend | Frontend | Overall |
|---|---|---|---|
| Authentication & User Management | 90% | 80% | **85%** |
| AI Study Guide Generation | 100% | 90% | **95%** |
| Dashboard & Analytics | 100% | 80% | **90%** |
| Quiz System | 100% | 30% | **65%** |
| Flashcards (SM-2) | 100% | 20% | **60%** |
| AI Doubt Solver | 100% | 0% | **50%** |
| Study Planner | 100% | 0% | **50%** |
| Resource Hub | 100% | 5% | **52%** |
| History System | 100% | 5% | **52%** |
| PDF Export | 100% | 0% | **50%** |
| Gamification | 0% | 5% | **2%** |
| Notifications | 0% | 0% | **0%** |
| Admin Panel | 0% | 0% | **0%** |

**Overall Platform Completion: ~58%**  
*(Backend is ~92% complete; Frontend integration is ~35% of available backend features)*

---

### Missing Components (Critical Gap)

1. **Doubt Solver UI** — most impactful missing feature; entire backend is ready
2. **Quiz backend submission** — breaks streak tracking and weak topic detection
3. **SM-2 rating UI** — SM-2 algorithm is wasted without user quality ratings
4. **HistoryPage API integration** — page shows fake data currently
5. **Study Planner UI** — complete backend system with no frontend
6. **Resource Hub UI** — complete backend with wrong route rendering

---

### Development Priority Order

1. 🔴 Wire quiz submission → `POST /api/v1/quiz/:id/attempt`
2. 🔴 Add SM-2 rating buttons → flashcard review endpoint
3. 🔴 Build AI Doubt Solver chat UI
4. 🔴 Connect HistoryPage to real API
5. 🔴 Fix sidebar brand name + /resources routing
6. 🟡 Build Study Planner page
7. 🟡 Build Resource Hub page
8. 🟡 Add PDF export buttons to UI
9. 🟡 Per-guide analytics tab in GuideDetailsPage
10. 🟡 Password reset flow

---

### Recommended Next Sprint (2 weeks)

**Sprint Goal: Connect existing backend to existing frontend**

| Task | Estimated effort | Impact |
|---|---|---|
| Wire quiz submission to backend | 1 day | High — enables streak/weak topic tracking |
| Add SM-2 rating UI to flashcard viewer | 1 day | High — enables spaced repetition |
| Build doubt solver chat tab in GuideDetailsPage | 2 days | High — major USP of the platform |
| Connect HistoryPage to /api/v1/history | 1 day | Medium |
| Fix sidebar name + resources route | 0.5 day | Quick win |
| Remove hardcoded data from CreateGuidePage | 0.5 day | Quick win |
| Auth 401 redirect in Axios interceptor | 0.5 day | Important for UX |

---

### Exact Tasks Required to Reach MVP

An MVP is defined as: all core study features are connected end-to-end (no hardcoded data, all features usable by a real student).

1. **Quiz submission wired to backend** ← `GuideDetailsPage.tsx` `handleSubmitAllQuiz()`
2. **SM-2 quality rating UI + endpoint call** ← `GuideDetailsPage.tsx` flashcard tab
3. **AI Doubt Solver chat UI** ← New component/tab in `GuideDetailsPage.tsx` or separate page
4. **HistoryPage connected to history APIs** ← Replace all hardcoded arrays in `HistoryPage.tsx`
5. **Study Planner page built** ← New page at `/planner` route with AI suggest + CRUD
6. **Resources page built** ← New page at `/resources` route with resource CRUD
7. **Fix sidebar brand name** ← 1-line change in `Sidebar.tsx`
8. **Fix routing** ← Remove duplicate route in `App.tsx` (line 29)
9. **Remove hardcoded stats in CreateGuidePage** ← Fetch from analytics API
10. **Auth 401 Axios interceptor** ← `lib/axios.ts` response interceptor

---

### Exact Tasks Required for Production Release

In addition to MVP tasks:

1. **Password reset email flow** ← Backend endpoint + frontend page + email service (SendGrid/Resend)
2. **Email verification on signup**
3. **Refresh token / auto-logout on JWT expiry**
4. **Cloud file storage for uploads** ← Replace `./uploads` with S3/R2/Cloudinary
5. **Cloud vector store** ← Replace `./data/*.json` with PostgreSQL pgvector or Pinecone
6. **Redis cache** ← Replace in-process Map cache
7. **Docker / deployment config** ← `Dockerfile`, `docker-compose.yml`
8. **Environment variable validation** ← Strict startup check for required vars
9. **File cleanup on guide delete** ← Add filesystem cleanup in `deleteGuide` controller
10. **Security audit** ← XSS, CSRF, SQL injection review (Prisma already parameterizes)
11. **Performance profiling** ← `computeReadiness()` query optimization
12. **Unit + integration tests** ← At minimum for AI pipeline, SM-2, evaluator, auth
13. **CI/CD pipeline** ← GitHub Actions or equivalent
14. **Error monitoring** ← Sentry or equivalent
15. **Usage analytics** ← Track Groq token usage for billing awareness

---

*This document was generated from direct static analysis of the codebase as of June 18, 2026. Always verify against the source code before making implementation decisions.*
