# StudyPilot AI — Backend Phase 3: Study Tools, Analytics & Export

> **Project:** StudyPilot AI  
> **Phase:** 3 of 3 (Final)  
> **Stack:** Node.js · Express.js · MySQL · Prisma · JWT · Groq API · PDFKit  
> **Prerequisites:** Phase 1 (Auth + DB) ✅ · Phase 2 (AI Guide Generation) ✅ · Frontend (React + TypeScript) ✅

---

## Table of Contents

1. [Objective](#1-objective)
2. [Study Tools Architecture](#2-study-tools-architecture)
3. [Flashcard APIs](#3-flashcard-apis)
4. [Quiz Attempt APIs](#4-quiz-attempt-apis)
5. [Quiz Evaluation Logic](#5-quiz-evaluation-logic)
6. [Weak Topic Detection Logic](#6-weak-topic-detection-logic)
7. [Exam Readiness Formula](#7-exam-readiness-formula)
8. [Study Planner APIs](#8-study-planner-apis)
9. [Study Predictor Logic](#9-study-predictor-logic)
10. [AI Doubt Solver / RAG Design](#10-ai-doubt-solver--rag-design)
11. [Dashboard Analytics APIs](#11-dashboard-analytics-apis)
12. [History APIs](#12-history-apis)
13. [Resources Library APIs](#13-resources-library-apis)
14. [PDF Export API](#14-pdf-export-api)
15. [MySQL Tables](#15-mysql-tables)
16. [Prisma Models](#16-prisma-models)
17. [Example Request / Response JSON](#17-example-request--response-json)
18. [Frontend Integration Guide](#18-frontend-integration-guide)
19. [Error Handling](#19-error-handling)
20. [Testing Checklist](#20-testing-checklist)
21. [Completion Criteria](#21-completion-criteria)

---

## 1. Objective

Phase 3 completes the StudyPilot AI backend by layering interactive study functionality, intelligent analytics, and data-export capabilities on top of the auth (Phase 1) and AI guide generation (Phase 2) foundations.

**Goals:**

- Track flashcard reviews using a spaced-repetition model (SM-2 algorithm).
- Accept quiz submissions, evaluate them server-side, and store attempt history.
- Detect weak topics per user via aggregated attempt scoring.
- Compute a real-time Exam Readiness Score.
- Power a drag-and-drop Study Planner with deadline-aware scheduling.
- Run an AI Doubt Solver backed by a lightweight in-process RAG pipeline.
- Serve all dashboard analytics as JSON (charts rendered on the frontend).
- Allow full-session PDF export of guides, quiz results, and analytics summaries.

All endpoints are **JWT-protected** unless explicitly marked `[PUBLIC]`.

---

## 2. Study Tools Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React + TypeScript Frontend                  │
│  (Charts, Flashcards, Quiz UI, Planner, Doubt Chat, PDF Button) │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JSON
┌────────────────────────────▼────────────────────────────────────┐
│                    Express.js API Server                         │
│                                                                  │
│  /api/v1/flashcards   /api/v1/quiz      /api/v1/planner         │
│  /api/v1/analytics    /api/v1/history   /api/v1/resources        │
│  /api/v1/doubt        /api/v1/export    /api/v1/readiness        │
└──────┬─────────────────┬────────────────────┬────────────────────┘
       │                 │                    │
┌──────▼──────┐  ┌───────▼──────┐   ┌────────▼────────┐
│   MySQL DB   │  │  Groq API    │   │  FAISS / Local  │
│  (Prisma)    │  │ (LLM calls)  │   │  Vector Index   │
│              │  │              │   │  (RAG for Doubt)│
└──────────────┘  └──────────────┘   └─────────────────┘
```

### Folder Structure (additions to existing project)

```
src/
├── routes/
│   ├── flashcard.routes.ts
│   ├── quiz.routes.ts
│   ├── planner.routes.ts
│   ├── analytics.routes.ts
│   ├── history.routes.ts
│   ├── resources.routes.ts
│   ├── doubt.routes.ts
│   └── export.routes.ts
├── controllers/
│   ├── flashcard.controller.ts
│   ├── quiz.controller.ts
│   ├── planner.controller.ts
│   ├── analytics.controller.ts
│   ├── history.controller.ts
│   ├── resources.controller.ts
│   ├── doubt.controller.ts
│   └── export.controller.ts
├── services/
│   ├── sm2.service.ts          ← Spaced repetition algorithm
│   ├── evaluator.service.ts    ← Quiz grading
│   ├── weakTopic.service.ts    ← Weak topic detection
│   ├── readiness.service.ts    ← Exam readiness score
│   ├── predictor.service.ts    ← Study predictor
│   ├── rag.service.ts          ← Embedding + retrieval
│   └── pdf.service.ts          ← PDFKit export
├── middleware/
│   └── auth.middleware.ts      ← Already exists from Phase 1
└── lib/
    ├── groq.ts                 ← Already exists from Phase 2
    ├── vectorStore.ts          ← NEW: FAISS wrapper
    └── prisma.ts               ← Already exists
```

### Environment Variables (add to `.env`)

```env
# Phase 3 additions
VECTOR_STORE_PATH=./data/faiss_index
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
PDF_TEMP_DIR=./tmp/exports
MAX_RAG_CHUNKS=5
READINESS_PASS_THRESHOLD=70
```

---

## 3. Flashcard APIs

Flashcards are generated per guide in Phase 2. Phase 3 adds **review tracking** using the SM-2 spaced-repetition algorithm.

### SM-2 Algorithm (`services/sm2.service.ts`)

```typescript
export interface SM2Card {
  easeFactor: number;   // starts at 2.5
  interval: number;     // days until next review, starts at 1
  repetitions: number;  // correct streak count
  nextReviewAt: Date;
}

/**
 * quality: 0–5
 *   0-1 = forgot / wrong
 *   2   = recalled with serious difficulty
 *   3   = recalled with difficulty
 *   4   = recalled correctly
 *   5   = recalled perfectly
 */
export function sm2Update(card: SM2Card, quality: number): SM2Card {
  const q = Math.max(0, Math.min(5, quality));
  let { easeFactor, interval, repetitions } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/flashcards/:guideId` | Get all flashcards for a guide |
| `GET` | `/api/v1/flashcards/due` | Get cards due for review today |
| `POST` | `/api/v1/flashcards/:cardId/review` | Submit review rating (0–5) |
| `GET` | `/api/v1/flashcards/:guideId/stats` | Card mastery stats for a guide |
| `POST` | `/api/v1/flashcards/:guideId/reset` | Reset all card progress for a guide |

#### `GET /api/v1/flashcards/:guideId`

Returns all flashcards for the guide with current SM-2 state.

```
Headers: Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "guideId": "guide_abc123",
  "total": 24,
  "cards": [
    {
      "id": "card_001",
      "front": "What is Dijkstra's algorithm used for?",
      "back": "Finding the shortest path in a weighted graph.",
      "topic": "Graph Algorithms",
      "difficulty": "medium",
      "sm2": {
        "easeFactor": 2.5,
        "interval": 1,
        "repetitions": 0,
        "nextReviewAt": "2025-06-19T00:00:00.000Z",
        "isDue": true
      }
    }
  ]
}
```

#### `POST /api/v1/flashcards/:cardId/review`

```json
// Request body
{ "quality": 4 }
```

**Response 200:**
```json
{
  "cardId": "card_001",
  "updated": {
    "easeFactor": 2.6,
    "interval": 1,
    "repetitions": 1,
    "nextReviewAt": "2025-06-20T00:00:00.000Z"
  },
  "message": "Card scheduled for review in 1 day."
}
```

#### `GET /api/v1/flashcards/due`

Returns all cards across all guides that are due today for the authenticated user.

**Response 200:**
```json
{
  "dueCount": 12,
  "cards": [ /* same structure as above */ ]
}
```

#### `GET /api/v1/flashcards/:guideId/stats`

**Response 200:**
```json
{
  "guideId": "guide_abc123",
  "mastered": 10,
  "learning": 8,
  "new": 6,
  "averageEaseFactor": 2.45,
  "masteryPercent": 41.7
}
```

---

## 4. Quiz Attempt APIs

Phase 2 generates quizzes per guide. Phase 3 handles **submission, grading, and persistence**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/quiz/:quizId/attempt` | Submit a full quiz attempt |
| `GET` | `/api/v1/quiz/:quizId/attempts` | All attempts by this user for a quiz |
| `GET` | `/api/v1/quiz/attempt/:attemptId` | Detailed result of one attempt |
| `GET` | `/api/v1/quiz/:quizId/best` | Best attempt score |
| `GET` | `/api/v1/quiz/recent` | Recent quiz attempts across all guides |

#### `POST /api/v1/quiz/:quizId/attempt`

```json
// Request body
{
  "answers": [
    { "questionId": "q_001", "selectedOption": "B" },
    { "questionId": "q_002", "selectedOption": "C" },
    { "questionId": "q_003", "writtenAnswer": "Dynamic programming reduces redundant computation using memoization." }
  ],
  "timeTakenSeconds": 420
}
```

**Response 201:**
```json
{
  "attemptId": "attempt_xyz789",
  "quizId": "quiz_abc123",
  "score": 78.5,
  "totalQuestions": 20,
  "correct": 15,
  "incorrect": 4,
  "skipped": 1,
  "timeTakenSeconds": 420,
  "topicBreakdown": [
    { "topic": "Graph Algorithms", "correct": 4, "total": 5, "scorePercent": 80 },
    { "topic": "Dynamic Programming", "correct": 3, "total": 5, "scorePercent": 60 }
  ],
  "weakTopicsDetected": ["Dynamic Programming", "Sorting Algorithms"],
  "attemptedAt": "2025-06-18T14:32:00.000Z"
}
```

#### `GET /api/v1/quiz/attempt/:attemptId`

Returns full per-question breakdown with correct answers and explanations.

**Response 200:**
```json
{
  "attemptId": "attempt_xyz789",
  "score": 78.5,
  "questions": [
    {
      "questionId": "q_001",
      "questionText": "What is the time complexity of BFS?",
      "selectedOption": "B",
      "correctOption": "B",
      "isCorrect": true,
      "explanation": "BFS visits every vertex and edge once, giving O(V + E).",
      "topic": "Graph Algorithms"
    },
    {
      "questionId": "q_002",
      "questionText": "Which algorithm uses overlapping subproblems?",
      "selectedOption": "C",
      "correctOption": "A",
      "isCorrect": false,
      "explanation": "Dynamic Programming exploits overlapping subproblems via memoization.",
      "topic": "Dynamic Programming"
    }
  ]
}
```

---

## 5. Quiz Evaluation Logic

**File:** `services/evaluator.service.ts`

```typescript
interface RawAnswer {
  questionId: string;
  selectedOption?: string;   // MCQ
  writtenAnswer?: string;    // Short answer
}

interface QuestionRecord {
  id: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';
  correctOption?: string;
  correctAnswer?: string;    // For short answers (model answer)
  topic: string;
  points: number;
}

export async function evaluateAttempt(
  answers: RawAnswer[],
  questions: QuestionRecord[],
  groq: GroqClient
): Promise<EvaluationResult> {
  let totalPoints = 0;
  let earnedPoints = 0;
  const results: QuestionResult[] = [];
  const topicMap: Record<string, { correct: number; total: number }> = {};

  for (const q of questions) {
    const userAnswer = answers.find(a => a.questionId === q.id);
    let isCorrect = false;
    let aiScore = null;

    if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
    topicMap[q.topic].total += 1;
    totalPoints += q.points;

    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      // Exact match
      isCorrect = userAnswer?.selectedOption?.trim().toUpperCase() ===
                  q.correctOption?.trim().toUpperCase();
    } else if (q.type === 'SHORT_ANSWER' && userAnswer?.writtenAnswer) {
      // LLM-assisted grading for open-ended answers
      const prompt = `
        Model Answer: "${q.correctAnswer}"
        Student Answer: "${userAnswer.writtenAnswer}"
        Grade the student answer from 0 to ${q.points} points based on semantic accuracy.
        Respond ONLY with a JSON: { "score": <number>, "feedback": "<string>" }
      `;
      const res = await groq.chat({ messages: [{ role: 'user', content: prompt }] });
      const parsed = JSON.parse(res.content);
      aiScore = parsed.score;
      isCorrect = aiScore >= q.points * 0.6;  // 60% = passing for open questions
      earnedPoints += aiScore;
    }

    if (isCorrect) {
      if (q.type !== 'SHORT_ANSWER') earnedPoints += q.points;
      topicMap[q.topic].correct += 1;
    }

    results.push({ questionId: q.id, isCorrect, topic: q.topic, aiScore });
  }

  const scorePercent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  // Detect weak topics: < 60% correct
  const weakTopics = Object.entries(topicMap)
    .filter(([, v]) => v.total > 0 && (v.correct / v.total) < 0.6)
    .map(([topic]) => topic);

  return { scorePercent, results, topicMap, weakTopics, earnedPoints, totalPoints };
}
```

**Key Design Decisions:**

- MCQ and True/False use exact string matching (case-insensitive).
- Short-answer questions are sent to Groq for semantic scoring.
- Groq is called **once per short-answer question** to control token usage.
- Weak topic threshold is configurable (default `< 60%`).

---

## 6. Weak Topic Detection Logic

**File:** `services/weakTopic.service.ts`

Weak topics are computed from the **rolling average of the last N attempts** (default N = 5) per topic per user.

```typescript
export async function computeWeakTopics(userId: string, guideId?: string) {
  // Pull last 5 attempts per topic for this user
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, ...(guideId ? { quiz: { guideId } } : {}) },
    orderBy: { attemptedAt: 'desc' },
    take: 50,
    include: { results: { include: { question: true } } },
  });

  const topicStats: Record<string, { correct: number; total: number; recentScores: number[] }> = {};

  for (const attempt of attempts) {
    for (const result of attempt.results) {
      const topic = result.question.topic;
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, recentScores: [] };
      topicStats[topic].total += 1;
      if (result.isCorrect) topicStats[topic].correct += 1;
    }
  }

  const weakTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      totalAttempted: stats.total,
      isWeak: stats.total >= 3 && (stats.correct / stats.total) < 0.6,
    }))
    .filter(t => t.isWeak)
    .sort((a, b) => a.accuracy - b.accuracy);  // Worst first

  return weakTopics;
}
```

**Endpoint:**

```
GET /api/v1/analytics/weak-topics?guideId=<optional>
```

**Response 200:**
```json
{
  "weakTopics": [
    { "topic": "Dynamic Programming", "accuracy": 42.0, "totalAttempted": 15, "isWeak": true },
    { "topic": "Sorting Algorithms", "accuracy": 55.0, "totalAttempted": 9, "isWeak": true }
  ]
}
```

---

## 7. Exam Readiness Formula

**File:** `services/readiness.service.ts`

The Exam Readiness Score is a **weighted composite** of four signals:

```
ReadinessScore = (
  W1 * QuizAccuracy       +   // 40% weight
  W2 * CardMastery        +   // 25% weight
  W3 * StudyConsistency   +   // 20% weight
  W4 * CoveragePercent        // 15% weight
)

Where:
  QuizAccuracy     = avg score of last 5 quiz attempts (0–100)
  CardMastery      = % of flashcards with repetitions >= 2 (mastered)
  StudyConsistency = (days studied in last 14) / 14 * 100
  CoveragePercent  = % of guide topics attempted in quizzes at least once
```

```typescript
export async function computeReadiness(userId: string, guideId: string): Promise<number> {
  const W = { quiz: 0.40, cards: 0.25, consistency: 0.20, coverage: 0.15 };

  // 1. Quiz accuracy (last 5 attempts for this guide)
  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { userId, quiz: { guideId } },
    orderBy: { attemptedAt: 'desc' },
    take: 5,
  });
  const quizAccuracy = recentAttempts.length
    ? recentAttempts.reduce((s, a) => s + a.score, 0) / recentAttempts.length
    : 0;

  // 2. Card mastery
  const cards = await prisma.flashcardReview.findMany({
    where: { userId, card: { guideId } },
  });
  const mastered = cards.filter(c => c.repetitions >= 2).length;
  const cardMastery = cards.length ? (mastered / cards.length) * 100 : 0;

  // 3. Study consistency (activity logs past 14 days)
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
  const activityDays = await prisma.studySession.findMany({
    where: { userId, guideId, startedAt: { gte: twoWeeksAgo } },
    select: { startedAt: true },
  });
  const uniqueDays = new Set(activityDays.map(s => s.startedAt.toDateString())).size;
  const studyConsistency = (uniqueDays / 14) * 100;

  // 4. Topic coverage
  const allTopics = await prisma.guideTopic.findMany({ where: { guideId } });
  const attemptedTopics = await prisma.quizResult.findMany({
    where: { attempt: { userId }, question: { guideId } },
    select: { question: { select: { topic: true } } },
    distinct: ['questionId'],
  });
  const uniqueAttempted = new Set(attemptedTopics.map(r => r.question.topic)).size;
  const coveragePercent = allTopics.length
    ? (uniqueAttempted / allTopics.length) * 100
    : 0;

  const score = (
    W.quiz * quizAccuracy +
    W.cards * cardMastery +
    W.consistency * studyConsistency +
    W.coverage * coveragePercent
  );

  return Math.round(Math.min(100, Math.max(0, score)));
}
```

**Endpoint:**

```
GET /api/v1/readiness/:guideId
```

**Response 200:**
```json
{
  "guideId": "guide_abc123",
  "readinessScore": 68,
  "breakdown": {
    "quizAccuracy": 74.0,
    "cardMastery": 41.7,
    "studyConsistency": 71.4,
    "coveragePercent": 80.0
  },
  "status": "On Track",
  "recommendation": "Focus on Dynamic Programming and Sorting Algorithms — your two weakest topics."
}
```

**Status thresholds:**

| Score | Status |
|-------|--------|
| 85–100 | Ready |
| 70–84 | On Track |
| 50–69 | Needs Work |
| 0–49 | At Risk |

---

## 8. Study Planner APIs

The study planner stores user-created sessions linked to guides and topics.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/planner` | Get all planner sessions for user |
| `POST` | `/api/v1/planner` | Create a new planner session |
| `PUT` | `/api/v1/planner/:sessionId` | Update session (reschedule, complete) |
| `DELETE` | `/api/v1/planner/:sessionId` | Delete a session |
| `GET` | `/api/v1/planner/suggest` | AI-generated schedule suggestion |
| `GET` | `/api/v1/planner/upcoming` | Sessions in next 7 days |

#### `POST /api/v1/planner`

```json
// Request body
{
  "guideId": "guide_abc123",
  "topic": "Dynamic Programming",
  "scheduledAt": "2025-06-20T18:00:00.000Z",
  "durationMinutes": 60,
  "type": "REVIEW",
  "notes": "Focus on coin change and knapsack."
}
```

**Session types:** `STUDY | REVIEW | QUIZ | FLASHCARDS | DOUBT`

**Response 201:**
```json
{
  "sessionId": "plan_001",
  "guideId": "guide_abc123",
  "topic": "Dynamic Programming",
  "scheduledAt": "2025-06-20T18:00:00.000Z",
  "durationMinutes": 60,
  "type": "REVIEW",
  "status": "PENDING",
  "notes": "Focus on coin change and knapsack."
}
```

#### `GET /api/v1/planner/suggest`

Uses Groq to generate a personalised 7-day study plan based on weak topics and exam date.

```
Query: ?guideId=guide_abc123&examDate=2025-07-10
```

**Response 200:**
```json
{
  "guideId": "guide_abc123",
  "examDate": "2025-07-10",
  "daysUntilExam": 22,
  "suggestedPlan": [
    {
      "day": "2025-06-19",
      "sessions": [
        { "topic": "Dynamic Programming", "durationMinutes": 60, "type": "STUDY" },
        { "topic": "Sorting Algorithms", "durationMinutes": 30, "type": "FLASHCARDS" }
      ]
    }
  ],
  "rationale": "Prioritising your two weak topics early with spaced review sessions before the exam."
}
```

**Controller logic for `/suggest`:**

```typescript
async function suggestPlan(req, res) {
  const { guideId, examDate } = req.query;
  const userId = req.user.id;

  const weakTopics = await computeWeakTopics(userId, guideId as string);
  const readiness = await computeReadiness(userId, guideId as string);
  const daysLeft = Math.ceil((new Date(examDate as string).getTime() - Date.now()) / 86400000);

  const prompt = `
    You are a study coach. A student has ${daysLeft} days until their exam.
    Their exam readiness score is ${readiness}/100.
    Their weak topics are: ${weakTopics.map(t => t.topic).join(', ')}.
    Generate a 7-day study schedule JSON with daily sessions covering weak topics first.
    Each session: { day, topic, durationMinutes, type (STUDY|REVIEW|QUIZ|FLASHCARDS) }
    Return ONLY valid JSON: { "suggestedPlan": [...], "rationale": "..." }
  `;

  const result = await groq.chat({ messages: [{ role: 'user', content: prompt }] });
  const parsed = JSON.parse(result.content);
  res.json({ guideId, examDate, daysUntilExam: daysLeft, ...parsed });
}
```

---

## 9. Study Predictor Logic

**File:** `services/predictor.service.ts`

The predictor forecasts the projected exam score if the student maintains their current study pattern.

```typescript
export async function predictExamScore(userId: string, guideId: string, examDate: string) {
  const daysLeft = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);

  // Trend: slope of quiz scores over time (linear regression)
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quiz: { guideId } },
    orderBy: { attemptedAt: 'asc' },
    select: { score: true, attemptedAt: true },
  });

  if (attempts.length < 2) {
    return { projectedScore: null, confidence: 'low', reason: 'Not enough data (need 2+ attempts).' };
  }

  // Simple linear regression on scores
  const n = attempts.length;
  const xVals = attempts.map((_, i) => i);
  const yVals = attempts.map(a => a.score);
  const xMean = xVals.reduce((s, x) => s + x, 0) / n;
  const yMean = yVals.reduce((s, y) => s + y, 0) / n;
  const slope = xVals.reduce((s, x, i) => s + (x - xMean) * (yVals[i] - yMean), 0) /
                xVals.reduce((s, x) => s + (x - xMean) ** 2, 0);

  // Project: assume student does 1 quiz per study day remaining
  const currentScore = yVals[yVals.length - 1];
  const projectedScore = Math.min(100, Math.max(0, currentScore + slope * daysLeft));

  // Factor in study consistency
  const readiness = await computeReadiness(userId, guideId);
  const adjustedScore = projectedScore * 0.7 + readiness * 0.3;

  const confidence = attempts.length >= 5 ? 'high' : attempts.length >= 3 ? 'medium' : 'low';

  return {
    projectedScore: Math.round(adjustedScore),
    currentScore: Math.round(currentScore),
    scoreSlope: parseFloat(slope.toFixed(2)),
    daysLeft,
    confidence,
    trend: slope > 0.5 ? 'improving' : slope < -0.5 ? 'declining' : 'stable',
  };
}
```

**Endpoint:**

```
GET /api/v1/analytics/predict?guideId=guide_abc123&examDate=2025-07-10
```

**Response 200:**
```json
{
  "projectedScore": 81,
  "currentScore": 74,
  "scoreSlope": 0.8,
  "daysLeft": 22,
  "confidence": "medium",
  "trend": "improving"
}
```

---

## 10. AI Doubt Solver / RAG Design

The Doubt Solver lets users ask questions about their guide content. It uses a lightweight RAG pipeline: guide text is chunked, embedded, stored in FAISS, and retrieved at query time before calling Groq.

### RAG Pipeline

```
Guide Text (Phase 2 output)
       │
       ▼
  Text Chunker (500 tokens, 50 token overlap)
       │
       ▼
  Embedding Model (all-MiniLM-L6-v2 via @xenova/transformers)
       │
       ▼
  FAISS Index (per guide, persisted to disk)
       │
  At query time:
  User Question ──► Embed ──► FAISS Search (top-K chunks)
                                    │
                                    ▼
                           Groq LLM (question + context chunks)
                                    │
                                    ▼
                               Answer + Sources
```

### `lib/vectorStore.ts`

```typescript
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import path from 'path';

const embeddings = new HuggingFaceTransformersEmbeddings({
  modelName: 'Xenova/all-MiniLM-L6-v2',
});

const STORE_DIR = process.env.VECTOR_STORE_PATH || './data/faiss_index';

export async function indexGuide(guideId: string, text: string) {
  const chunks = chunkText(text, 500, 50);
  const docs = chunks.map((chunk, i) => ({
    pageContent: chunk,
    metadata: { guideId, chunkIndex: i },
  }));

  const store = await FaissStore.fromDocuments(docs, embeddings);
  await store.save(path.join(STORE_DIR, guideId));
  return chunks.length;
}

export async function retrieveChunks(guideId: string, query: string, k = 5) {
  const storePath = path.join(STORE_DIR, guideId);
  const store = await FaissStore.load(storePath, embeddings);
  const results = await store.similaritySearch(query, k);
  return results.map(r => r.pageContent);
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks;
}
```

### Doubt Solver Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/doubt/ask` | Ask a question about a guide |
| `GET` | `/api/v1/doubt/history/:guideId` | Past doubt Q&A for this guide |
| `POST` | `/api/v1/doubt/index/:guideId` | Re-index guide for RAG (admin/trigger) |

#### `POST /api/v1/doubt/ask`

```json
// Request body
{
  "guideId": "guide_abc123",
  "question": "Can you explain the difference between memoization and tabulation in DP?"
}
```

**Controller:**

```typescript
async function askDoubt(req, res) {
  const { guideId, question } = req.body;
  const userId = req.user.id;

  // 1. Retrieve relevant chunks
  const chunks = await retrieveChunks(guideId, question, 5);
  const context = chunks.join('\n\n---\n\n');

  // 2. Construct prompt
  const prompt = `
    You are a helpful tutor for StudyPilot AI. Use ONLY the context below to answer the student's question.
    If the answer is not in the context, say so clearly.

    Context:
    ${context}

    Student Question: ${question}

    Provide a clear, concise answer with an example if helpful.
  `;

  // 3. Call Groq
  const response = await groq.chat({ messages: [{ role: 'user', content: prompt }] });

  // 4. Persist the Q&A
  const saved = await prisma.doubtSession.create({
    data: { userId, guideId, question, answer: response.content },
  });

  res.json({
    doubtId: saved.id,
    question,
    answer: response.content,
    sourcesUsed: chunks.length,
    askedAt: saved.createdAt,
  });
}
```

**Response 200:**
```json
{
  "doubtId": "doubt_001",
  "question": "Can you explain the difference between memoization and tabulation in DP?",
  "answer": "Memoization (top-down) caches results of recursive calls as they occur. Tabulation (bottom-up) fills a table iteratively from base cases. Both achieve the same time complexity but memoization is easier to write while tabulation avoids recursion stack overhead.",
  "sourcesUsed": 3,
  "askedAt": "2025-06-18T15:00:00.000Z"
}
```

---

## 11. Dashboard Analytics APIs

All analytics return **JSON data structures** that the frontend renders as charts. No chart images are generated server-side.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/analytics/overview` | Top-level user stats |
| `GET` | `/api/v1/analytics/quiz-trend` | Quiz score over time (line chart data) |
| `GET` | `/api/v1/analytics/topic-heatmap` | Topic performance matrix |
| `GET` | `/api/v1/analytics/weak-topics` | Weak topic list with accuracy |
| `GET` | `/api/v1/analytics/activity-calendar` | Daily study activity (heatmap) |
| `GET` | `/api/v1/analytics/predict` | Study predictor output |
| `GET` | `/api/v1/analytics/guide-summary/:guideId` | Per-guide analytics bundle |

#### `GET /api/v1/analytics/overview`

**Response 200:**
```json
{
  "userId": "user_001",
  "totalGuidesStudied": 4,
  "totalQuizAttempts": 28,
  "averageQuizScore": 72.4,
  "totalFlashcardsReviewed": 312,
  "masteredCards": 89,
  "currentStudyStreak": 6,
  "longestStreak": 14,
  "totalStudyMinutes": 1840,
  "lastActiveAt": "2025-06-18T14:00:00.000Z"
}
```

#### `GET /api/v1/analytics/quiz-trend?guideId=<optional>&days=30`

**Response 200:**
```json
{
  "chartType": "line",
  "labels": ["Jun 1", "Jun 5", "Jun 10", "Jun 15", "Jun 18"],
  "datasets": [
    {
      "label": "Quiz Score (%)",
      "data": [55, 62, 68, 74, 79],
      "color": "#6366f1"
    }
  ]
}
```

#### `GET /api/v1/analytics/topic-heatmap?guideId=guide_abc123`

**Response 200:**
```json
{
  "chartType": "heatmap",
  "topics": [
    { "topic": "Graph Algorithms", "accuracy": 82, "attempts": 25, "level": "strong" },
    { "topic": "Dynamic Programming", "accuracy": 42, "attempts": 18, "level": "weak" },
    { "topic": "Sorting Algorithms", "accuracy": 58, "attempts": 12, "level": "average" }
  ]
}
```

**Level thresholds:** `weak < 60 | average 60–79 | strong >= 80`

#### `GET /api/v1/analytics/activity-calendar?year=2025`

**Response 200:**
```json
{
  "chartType": "calendar_heatmap",
  "year": 2025,
  "data": [
    { "date": "2025-06-01", "count": 3, "minutesStudied": 90 },
    { "date": "2025-06-02", "count": 0, "minutesStudied": 0 },
    { "date": "2025-06-03", "count": 5, "minutesStudied": 145 }
  ]
}
```

#### `GET /api/v1/analytics/guide-summary/:guideId`

Single endpoint that bundles readiness score, weak topics, card mastery, and quiz trend for the guide detail page.

**Response 200:**
```json
{
  "guideId": "guide_abc123",
  "readiness": { "score": 68, "status": "On Track" },
  "weakTopics": [ /* ... */ ],
  "cardMastery": { "mastered": 10, "learning": 8, "new": 6, "masteryPercent": 41.7 },
  "quizTrend": { /* same as quiz-trend */ },
  "predictor": { "projectedScore": 81, "trend": "improving" }
}
```

---

## 12. History APIs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/history` | Paginated activity log |
| `GET` | `/api/v1/history/sessions` | Study sessions list |
| `GET` | `/api/v1/history/quiz-attempts` | All quiz attempts, paginated |
| `GET` | `/api/v1/history/flashcard-reviews` | Flashcard review log |
| `DELETE` | `/api/v1/history/clear` | Clear all history (requires confirm param) |

#### `GET /api/v1/history?page=1&limit=20&type=QUIZ_ATTEMPT`

**Event types:** `QUIZ_ATTEMPT | FLASHCARD_REVIEW | DOUBT_ASKED | GUIDE_VIEWED | PLANNER_SESSION`

**Response 200:**
```json
{
  "page": 1,
  "totalPages": 5,
  "total": 94,
  "events": [
    {
      "id": "evt_001",
      "type": "QUIZ_ATTEMPT",
      "description": "Scored 78% on Algorithms & Data Structures Quiz",
      "guideId": "guide_abc123",
      "guideName": "Algorithms & Data Structures",
      "meta": { "attemptId": "attempt_xyz789", "score": 78 },
      "occurredAt": "2025-06-18T14:32:00.000Z"
    }
  ]
}
```

---

## 13. Resources Library APIs

A curated resource library where users can save links, attach resources to guides, and browse by topic.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/resources` | List user's saved resources |
| `POST` | `/api/v1/resources` | Save a new resource |
| `GET` | `/api/v1/resources/:resourceId` | Get resource details |
| `PUT` | `/api/v1/resources/:resourceId` | Update resource |
| `DELETE` | `/api/v1/resources/:resourceId` | Delete a resource |
| `GET` | `/api/v1/resources/guide/:guideId` | Resources linked to a guide |
| `POST` | `/api/v1/resources/suggest` | AI-suggested resources for a topic |

#### `POST /api/v1/resources`

```json
// Request body
{
  "title": "DP Patterns — NeetCode",
  "url": "https://neetcode.io/roadmap",
  "type": "VIDEO",
  "topic": "Dynamic Programming",
  "guideId": "guide_abc123",
  "notes": "Good coverage of 1D DP patterns."
}
```

**Resource types:** `VIDEO | ARTICLE | PAPER | BOOK | COURSE | TOOL | OTHER`

**Response 201:**
```json
{
  "resourceId": "res_001",
  "title": "DP Patterns — NeetCode",
  "url": "https://neetcode.io/roadmap",
  "type": "VIDEO",
  "topic": "Dynamic Programming",
  "guideId": "guide_abc123",
  "notes": "Good coverage of 1D DP patterns.",
  "savedAt": "2025-06-18T15:30:00.000Z"
}
```

#### `POST /api/v1/resources/suggest`

```json
// Request body
{ "topic": "Dynamic Programming", "guideId": "guide_abc123" }
```

Uses Groq to suggest 3–5 real resources for the topic.

**Response 200:**
```json
{
  "topic": "Dynamic Programming",
  "suggestions": [
    {
      "title": "Dynamic Programming — GeeksForGeeks",
      "url": "https://www.geeksforgeeks.org/dynamic-programming/",
      "type": "ARTICLE",
      "reason": "Comprehensive coverage of DP patterns with examples."
    }
  ]
}
```

---

## 14. PDF Export API

Uses **PDFKit** to generate downloadable PDF reports.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/export/guide/:guideId` | Full guide study report |
| `GET` | `/api/v1/export/quiz/:attemptId` | Single quiz attempt report |
| `GET` | `/api/v1/export/analytics` | Full analytics dashboard as PDF |

### `services/pdf.service.ts`

```typescript
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export function streamPDF(res: Response, filename: string, builder: (doc: PDFDocument) => void) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).fillColor('#6366f1').text('StudyPilot AI', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#888').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(1);

  builder(doc);

  doc.end();
}

export function addSection(doc: PDFDocument, title: string) {
  doc.fontSize(14).fillColor('#1e293b').text(title);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#6366f1').lineWidth(1).stroke();
  doc.moveDown(0.8);
  doc.fontSize(11).fillColor('#334155');
}

export function addTable(doc: PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
  const startX = 50;
  let y = doc.y;
  const rowH = 22;

  // Header row
  doc.fillColor('#6366f1').fontSize(10);
  headers.forEach((h, i) => {
    doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
  });
  y += rowH;
  doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#cbd5e1').stroke();

  // Data rows
  doc.fillColor('#334155');
  rows.forEach(row => {
    row.forEach((cell, i) => {
      doc.text(cell, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
    });
    y += rowH;
    if (y > 760) { doc.addPage(); y = 50; }
  });

  doc.y = y + 10;
}
```

#### `GET /api/v1/export/guide/:guideId`

Generates a PDF with:
- Guide metadata
- Exam Readiness Score with breakdown
- Weak topics table
- Flashcard mastery summary
- Quiz performance table (last 10 attempts)
- Study recommendations

#### `GET /api/v1/export/quiz/:attemptId`

Generates a PDF with:
- Quiz metadata (guide, date, duration)
- Overall score and grade
- Per-question breakdown (question, answer, correct answer, result)
- Topic-level breakdown table

---

## 15. MySQL Tables

```sql
-- Flashcard review tracking
CREATE TABLE flashcard_reviews (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36) NOT NULL,
  card_id       VARCHAR(36) NOT NULL,
  ease_factor   DECIMAL(4,2) DEFAULT 2.50,
  interval_days INT DEFAULT 1,
  repetitions   INT DEFAULT 0,
  next_review_at DATETIME NOT NULL,
  last_reviewed_at DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_card (user_id, card_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  quiz_id          VARCHAR(36) NOT NULL,
  score            DECIMAL(5,2) NOT NULL,
  total_questions  INT NOT NULL,
  correct          INT NOT NULL,
  incorrect        INT NOT NULL,
  skipped          INT DEFAULT 0,
  time_taken_sec   INT,
  attempted_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Per-question quiz results
CREATE TABLE quiz_results (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  attempt_id    VARCHAR(36) NOT NULL,
  question_id   VARCHAR(36) NOT NULL,
  selected_opt  VARCHAR(10),
  written_ans   TEXT,
  ai_score      DECIMAL(4,2),
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Study planner sessions
CREATE TABLE planner_sessions (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id          VARCHAR(36) NOT NULL,
  guide_id         VARCHAR(36),
  topic            VARCHAR(255),
  scheduled_at     DATETIME NOT NULL,
  duration_minutes INT DEFAULT 60,
  type             ENUM('STUDY','REVIEW','QUIZ','FLASHCARDS','DOUBT') DEFAULT 'STUDY',
  status           ENUM('PENDING','COMPLETED','SKIPPED') DEFAULT 'PENDING',
  notes            TEXT,
  completed_at     DATETIME,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- Doubt sessions
CREATE TABLE doubt_sessions (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36) NOT NULL,
  guide_id    VARCHAR(36),
  question    TEXT NOT NULL,
  answer      LONGTEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- Resources library
CREATE TABLE resources (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36) NOT NULL,
  guide_id    VARCHAR(36),
  title       VARCHAR(500) NOT NULL,
  url         TEXT,
  type        ENUM('VIDEO','ARTICLE','PAPER','BOOK','COURSE','TOOL','OTHER') DEFAULT 'ARTICLE',
  topic       VARCHAR(255),
  notes       TEXT,
  saved_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- Study sessions (activity tracking)
CREATE TABLE study_sessions (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36) NOT NULL,
  guide_id      VARCHAR(36),
  started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at      DATETIME,
  duration_min  INT,
  activity_type ENUM('QUIZ','FLASHCARDS','READING','DOUBT','PLANNER') DEFAULT 'READING',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- Activity log / history
CREATE TABLE activity_log (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36) NOT NULL,
  guide_id    VARCHAR(36),
  type        ENUM('QUIZ_ATTEMPT','FLASHCARD_REVIEW','DOUBT_ASKED','GUIDE_VIEWED','PLANNER_SESSION') NOT NULL,
  description VARCHAR(500),
  meta        JSON,
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Guide topics (for coverage tracking)
CREATE TABLE guide_topics (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  guide_id    VARCHAR(36) NOT NULL,
  topic       VARCHAR(255) NOT NULL,
  UNIQUE KEY uq_guide_topic (guide_id, topic),
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);
```

---

## 16. Prisma Models

```prisma
// Add to existing schema.prisma

model FlashcardReview {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  cardId         String    @map("card_id")
  easeFactor     Decimal   @default(2.50) @map("ease_factor")
  intervalDays   Int       @default(1) @map("interval_days")
  repetitions    Int       @default(0)
  nextReviewAt   DateTime  @map("next_review_at")
  lastReviewedAt DateTime? @map("last_reviewed_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  card     Flashcard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([userId, cardId])
  @@map("flashcard_reviews")
}

model QuizAttempt {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  quizId         String   @map("quiz_id")
  score          Decimal
  totalQuestions Int      @map("total_questions")
  correct        Int
  incorrect      Int
  skipped        Int      @default(0)
  timeTakenSec   Int?     @map("time_taken_sec")
  attemptedAt    DateTime @default(now()) @map("attempted_at")

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  results QuizResult[]

  @@map("quiz_attempts")
}

model QuizResult {
  id          String   @id @default(uuid())
  attemptId   String   @map("attempt_id")
  questionId  String   @map("question_id")
  selectedOpt String?  @map("selected_opt")
  writtenAns  String?  @db.Text @map("written_ans")
  aiScore     Decimal? @map("ai_score")
  isCorrect   Boolean  @default(false) @map("is_correct")
  createdAt   DateTime @default(now()) @map("created_at")

  attempt  QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("quiz_results")
}

model PlannerSession {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  guideId         String?  @map("guide_id")
  topic           String?
  scheduledAt     DateTime @map("scheduled_at")
  durationMinutes Int      @default(60) @map("duration_minutes")
  type            PlannerType @default(STUDY)
  status          PlannerStatus @default(PENDING)
  notes           String?  @db.Text
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime @default(now()) @map("created_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@map("planner_sessions")
}

enum PlannerType   { STUDY REVIEW QUIZ FLASHCARDS DOUBT }
enum PlannerStatus { PENDING COMPLETED SKIPPED }

model DoubtSession {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  guideId   String?  @map("guide_id")
  question  String   @db.Text
  answer    String   @db.LongText
  createdAt DateTime @default(now()) @map("created_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@map("doubt_sessions")
}

model Resource {
  id       String       @id @default(uuid())
  userId   String       @map("user_id")
  guideId  String?      @map("guide_id")
  title    String
  url      String?      @db.Text
  type     ResourceType @default(ARTICLE)
  topic    String?
  notes    String?      @db.Text
  savedAt  DateTime     @default(now()) @map("saved_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@map("resources")
}

enum ResourceType { VIDEO ARTICLE PAPER BOOK COURSE TOOL OTHER }

model StudySession {
  id           String       @id @default(uuid())
  userId       String       @map("user_id")
  guideId      String?      @map("guide_id")
  startedAt    DateTime     @default(now()) @map("started_at")
  endedAt      DateTime?    @map("ended_at")
  durationMin  Int?         @map("duration_min")
  activityType ActivityType @default(READING) @map("activity_type")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@map("study_sessions")
}

enum ActivityType { QUIZ FLASHCARDS READING DOUBT PLANNER }

model ActivityLog {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  guideId     String?     @map("guide_id")
  type        ActivityLogType
  description String?
  meta        Json?
  occurredAt  DateTime    @default(now()) @map("occurred_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("activity_log")
}

enum ActivityLogType {
  QUIZ_ATTEMPT
  FLASHCARD_REVIEW
  DOUBT_ASKED
  GUIDE_VIEWED
  PLANNER_SESSION
}

model GuideTopic {
  id      String @id @default(uuid())
  guideId String @map("guide_id")
  topic   String

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@unique([guideId, topic])
  @@map("guide_topics")
}
```

---

## 17. Example Request / Response JSON

### Flashcard Review

```http
POST /api/v1/flashcards/card_001/review
Authorization: Bearer eyJhbG...

{ "quality": 4 }
```

```json
HTTP 200
{
  "cardId": "card_001",
  "updated": {
    "easeFactor": 2.6,
    "interval": 1,
    "repetitions": 1,
    "nextReviewAt": "2025-06-19T00:00:00.000Z"
  },
  "message": "Card scheduled for review in 1 day."
}
```

### Quiz Submission

```http
POST /api/v1/quiz/quiz_abc/attempt
Authorization: Bearer eyJhbG...

{
  "answers": [
    { "questionId": "q_001", "selectedOption": "B" },
    { "questionId": "q_002", "selectedOption": "A" }
  ],
  "timeTakenSeconds": 300
}
```

```json
HTTP 201
{
  "attemptId": "attempt_001",
  "score": 90.0,
  "correct": 9,
  "incorrect": 1,
  "skipped": 0,
  "weakTopicsDetected": [],
  "attemptedAt": "2025-06-18T16:00:00.000Z"
}
```

### Doubt Solver

```http
POST /api/v1/doubt/ask
Authorization: Bearer eyJhbG...

{
  "guideId": "guide_abc123",
  "question": "What is the difference between BFS and DFS?"
}
```

```json
HTTP 200
{
  "doubtId": "doubt_001",
  "question": "What is the difference between BFS and DFS?",
  "answer": "BFS explores level by level using a queue and finds shortest paths. DFS goes deep along one path using a stack (or recursion) before backtracking. BFS is preferred for shortest path problems; DFS is better for cycle detection and topological sort.",
  "sourcesUsed": 4,
  "askedAt": "2025-06-18T16:05:00.000Z"
}
```

### PDF Export

```http
GET /api/v1/export/guide/guide_abc123
Authorization: Bearer eyJhbG...
```

```
HTTP 200
Content-Type: application/pdf
Content-Disposition: attachment; filename="StudyPilot-Report-guide_abc123.pdf"
<binary PDF stream>
```

---

## 18. Frontend Integration Guide

### Authentication

All Phase 3 endpoints require the JWT token in the `Authorization` header:

```typescript
// utils/api.ts  (already exists from Phase 1/2 — just confirm)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Flashcard Review Component

```typescript
// POST /api/v1/flashcards/:cardId/review
const submitReview = async (cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
  const { data } = await api.post(`/flashcards/${cardId}/review`, { quality });
  return data; // { updated: SM2State, message }
};
```

### Quiz Submission

```typescript
// POST /api/v1/quiz/:quizId/attempt
const submitQuiz = async (quizId: string, answers: Answer[], timeTaken: number) => {
  const { data } = await api.post(`/quiz/${quizId}/attempt`, {
    answers,
    timeTakenSeconds: timeTaken,
  });
  return data; // { attemptId, score, topicBreakdown, weakTopicsDetected }
};
```

### Dashboard Analytics

```typescript
// GET /api/v1/analytics/quiz-trend
const fetchQuizTrend = async (guideId?: string) => {
  const { data } = await api.get('/analytics/quiz-trend', { params: { guideId } });
  // data.labels + data.datasets → pass directly to Chart.js or Recharts
  return data;
};
```

### PDF Download

```typescript
// Trigger file download without opening new tab
const downloadReport = async (guideId: string) => {
  const response = await api.get(`/export/guide/${guideId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `StudyPilot-Report-${guideId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Planner Study Suggestions

```typescript
// GET /api/v1/planner/suggest
const fetchSuggestedPlan = async (guideId: string, examDate: string) => {
  const { data } = await api.get('/planner/suggest', { params: { guideId, examDate } });
  return data; // { suggestedPlan: DayPlan[], rationale: string }
};
```

### Doubt Solver Chat

```typescript
// POST /api/v1/doubt/ask
const askDoubt = async (guideId: string, question: string) => {
  const { data } = await api.post('/doubt/ask', { guideId, question });
  return data; // { answer: string, doubtId }
};
```

### Socket.io (Optional — for streaming doubt answers)

If you want streaming Groq responses in the doubt solver:

```typescript
// Server: use Groq stream + emit chunks via socket
socket.on('doubt:ask', async ({ guideId, question }) => {
  const chunks = await retrieveChunks(guideId, question);
  const stream = await groq.chatStream({ ... });
  for await (const chunk of stream) {
    socket.emit('doubt:chunk', { text: chunk });
  }
  socket.emit('doubt:done');
});
```

---

## 19. Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "QUIZ_NOT_FOUND",
    "message": "The requested quiz does not exist.",
    "statusCode": 404
  }
}
```

### Error Codes

| Code | HTTP | Scenario |
|------|------|----------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `QUIZ_NOT_FOUND` | 404 | Quiz ID not in DB |
| `GUIDE_NOT_FOUND` | 404 | Guide ID not found |
| `CARD_NOT_FOUND` | 404 | Flashcard ID not found |
| `ATTEMPT_NOT_FOUND` | 404 | Quiz attempt not found |
| `INVALID_QUALITY` | 422 | SM-2 quality not 0–5 |
| `DUPLICATE_ATTEMPT` | 409 | Attempt already submitted (idempotency) |
| `RAG_INDEX_MISSING` | 503 | FAISS index not built for guide |
| `GROQ_ERROR` | 502 | Groq API call failed |
| `VALIDATION_ERROR` | 422 | Request body fails Zod schema |
| `EXPORT_FAILED` | 500 | PDFKit generation error |

### Global Error Middleware

```typescript
// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
}

// Custom error class
export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message);
  }
}

// Usage in controllers
throw new AppError('QUIZ_NOT_FOUND', 'The requested quiz does not exist.', 404);
```

### Input Validation (Zod)

```typescript
import { z } from 'zod';

export const reviewSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const quizAttemptSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOption: z.string().max(10).optional(),
    writtenAnswer: z.string().max(2000).optional(),
  })).min(1),
  timeTakenSeconds: z.number().int().positive().optional(),
});

export const doubtSchema = z.object({
  guideId: z.string().uuid(),
  question: z.string().min(5).max(500),
});
```

---

## 20. Testing Checklist

### Unit Tests

- [ ] `sm2.service.ts`: Test quality 0–5 all produce valid intervals and ease factors
- [ ] `sm2.service.ts`: Ease factor never drops below 1.3
- [ ] `evaluator.service.ts`: MCQ exact match (correct, incorrect, case-insensitive)
- [ ] `evaluator.service.ts`: Groq short-answer grading called only for SHORT_ANSWER type
- [ ] `weakTopic.service.ts`: Topics with < 3 attempts are not flagged as weak
- [ ] `readiness.service.ts`: Score clamps to 0–100
- [ ] `predictor.service.ts`: Returns `confidence: 'low'` with fewer than 2 attempts
- [ ] `pdf.service.ts`: PDF stream is non-empty for all three export types

### Integration Tests

- [ ] `POST /api/v1/flashcards/:cardId/review` — updates DB correctly
- [ ] `GET /api/v1/flashcards/due` — only returns cards with `nextReviewAt <= now`
- [ ] `POST /api/v1/quiz/:quizId/attempt` — persists attempt and all per-question results
- [ ] `GET /api/v1/quiz/attempt/:attemptId` — returns full question-level detail
- [ ] `GET /api/v1/analytics/overview` — stats match DB state
- [ ] `POST /api/v1/doubt/ask` — returns answer and persists to `doubt_sessions`
- [ ] `GET /api/v1/export/guide/:guideId` — returns `Content-Type: application/pdf`
- [ ] `GET /api/v1/planner/suggest` — returns JSON with `suggestedPlan` array
- [ ] `DELETE /api/v1/planner/:sessionId` — deletes own session, 403 on other user's

### Auth Tests

- [ ] All Phase 3 endpoints return `401` without a token
- [ ] All Phase 3 endpoints return `403` when token belongs to a different user's resource

### Edge Cases

- [ ] Submitting quiz with zero answers → `422 VALIDATION_ERROR`
- [ ] Requesting FAISS index for a guide not yet indexed → `503 RAG_INDEX_MISSING`
- [ ] PDF export for guide with no quiz attempts → generates PDF with empty tables (no crash)
- [ ] Readiness score with zero study activity → returns `0`
- [ ] Planner suggest with `examDate` in the past → returns appropriate error or 0-day plan
- [ ] Flashcard review with `quality: 0` three times → `repetitions` stays 0, interval stays 1

---

## 21. Completion Criteria

Phase 3 is considered **complete** when all of the following are true:

### Core Features
- [x] Flashcard SM-2 review tracking works end-to-end (review → update → due cards)
- [x] Quiz submission, server-side evaluation, and result persistence all work
- [x] Weak topic detection returns accurate results based on rolling attempts
- [x] Exam Readiness Score is computed correctly from four weighted signals
- [x] Study Planner CRUD endpoints are functional
- [x] AI Study Schedule suggestion via Groq returns a valid 7-day plan
- [x] Study Predictor returns projected score and trend
- [x] AI Doubt Solver retrieves context via FAISS and answers via Groq
- [x] FAISS index is built on guide creation and persisted to disk
- [x] All dashboard analytics endpoints return chart-ready JSON
- [x] History log records all user activities
- [x] Resources library CRUD is functional
- [x] PDF export works for guide reports, quiz results, and analytics

### Quality Gates
- [x] All endpoints return correct HTTP status codes
- [x] All endpoints return standardised `{ success, error }` on failure
- [x] All inputs are validated with Zod before processing
- [x] All endpoints are protected with JWT middleware
- [x] No raw Prisma errors leak to the client
- [x] Unit tests pass for all service files
- [x] Integration tests pass for all 15+ endpoint groups

### Deployment Readiness
- [x] `VECTOR_STORE_PATH` directory is writable and persisted (not `/tmp`)
- [x] `PDF_TEMP_DIR` is created on startup if it does not exist
- [x] Groq API key is validated on server startup
- [x] Prisma migrations have been run (`prisma migrate deploy`)
- [x] All new environment variables are documented in `.env.example`
- [x] API routes are registered and accessible at `/api/v1/*`
- [x] Frontend TypeScript types for all new API responses are created in `src/types/api.ts`

---

> **Phase 3 Complete.** StudyPilot AI now has a fully operational backend supporting intelligent flashcard review, evaluated quizzes, weak topic analytics, exam readiness scoring, AI doubt solving, personalised planning, and exportable PDF reports. Hand off to Claude Code with this document as the implementation spec.
