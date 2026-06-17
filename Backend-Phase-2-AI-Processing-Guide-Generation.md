# StudyPilot AI — Backend Phase 2: AI Processing & Guide Generation

> **Document Type:** Implementation-Ready Backend Documentation  
> **Phase:** 2 — AI-Powered Guide Generation  
> **Stack:** Node.js · Express.js · MySQL · Prisma · Groq API  
> **AI Model:** `llama-3.1-8b-instant` via Groq  
> **Status:** Ready for Claude Code Integration  
> **Prerequisite:** Phase 1 complete (Express, MySQL, Prisma, JWT auth, login/signup, protected routes, basic guide records)

---

## Table of Contents

1. [Objective](#1-objective)
2. [API Architecture](#2-api-architecture)
3. [Input Processing Flow](#3-input-processing-flow)
4. [PDF Extraction API](#4-pdf-extraction-api)
5. [Notes Processing API](#5-notes-processing-api)
6. [YouTube Transcript API](#6-youtube-transcript-api)
7. [Groq Client Setup](#7-groq-client-setup)
8. [Prompt Design](#8-prompt-design)
9. [JSON Response Validation](#9-json-response-validation)
10. [Guide Generation Pipeline](#10-guide-generation-pipeline)
11. [MySQL Tables](#11-mysql-tables)
12. [Prisma Models](#12-prisma-models)
13. [API Endpoints](#13-api-endpoints)
14. [Example Request/Response JSON](#14-example-requestresponse-json)
15. [Frontend Integration Guide](#15-frontend-integration-guide)
16. [Error Handling](#16-error-handling)
17. [Rate Limit Handling](#17-rate-limit-handling)
18. [Caching Strategy](#18-caching-strategy)
19. [Testing Checklist](#19-testing-checklist)
20. [Completion Criteria](#20-completion-criteria)

---

## 1. Objective

Phase 2 extends the existing StudyPilot AI backend with an intelligent guide generation pipeline. The system accepts three input types from the React/TypeScript frontend — PDF uploads, pasted notes, and YouTube URLs — and transforms them into richly structured study guides persisted in MySQL.

### What Phase 2 Produces

For every guide generation request, the backend will produce and persist:

| Output Field | Description |
|---|---|
| `rawContent` | Original extracted text from the source |
| `cleanedContent` | Normalized, de-duplicated, readable version |
| `shortSummary` | 2–3 sentence overview |
| `detailedSummary` | Full paragraph-level summary |
| `keyConcepts` | Array of important terms and definitions |
| `topics` | Flat list of subject topics |
| `topicHierarchy` | Nested tree of topics and subtopics |
| `metadata` | Source type, word count, estimated reading time, language |
| `flashcards` | Question/answer pairs for active recall |
| `quizQuestions` | MCQ questions with options and correct answers |
| `revisionSheet` | Structured bullet-point revision reference |

### Design Constraints

- The React frontend is **already built** — the backend must match the API contract the frontend expects.
- All AI output must be **persisted to MySQL** so the frontend can fetch it on demand without re-generating.
- Groq is used as the AI provider for its **free-tier availability** and speed.
- The system must be **idempotent**: re-submitting the same source should return the cached result, not re-invoke Groq.

---

## 2. API Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        React/TypeScript Frontend                     │
│  (Already built — consumes REST API, expects specific JSON shapes)   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTPS REST
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Express.js API Server                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    Phase 1 (Already Done)                   │     │
│  │  JWT Auth Middleware · Login/Signup · Protected Routes      │     │
│  │  Basic Guide CRUD · Prisma Client · MySQL Connection        │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                  Phase 2 (This Document)                    │     │
│  │                                                             │     │
│  │  /api/guides/generate/pdf    ←── Multer upload             │     │
│  │  /api/guides/generate/notes  ←── Raw text body             │     │
│  │  /api/guides/generate/youtube ←── YouTube URL              │     │
│  │  /api/guides/:id             ←── Fetch stored guide        │     │
│  │  /api/guides/:id/flashcards  ←── Fetch flashcards          │     │
│  │  /api/guides/:id/quiz        ←── Fetch quiz questions      │     │
│  │  /api/guides/:id/revision    ←── Fetch revision sheet      │     │
│  └──────────────┬──────────────────────────┬────────────────────┘     │
│                 │                          │                          │
│        ┌────────▼───────┐        ┌─────────▼──────────┐              │
│        │  Extraction    │        │   Groq AI Client   │              │
│        │  Layer         │        │   (llama-3.1-8b)   │              │
│        │                │        │                    │              │
│        │  pdf-parse     │        │   Prompt Builder   │              │
│        │  Multer/Buffer │        │   Response Parser  │              │
│        │  yt-transcript │        │   JSON Validator   │              │
│        └────────┬───────┘        └─────────┬──────────┘              │
│                 └──────────┬───────────────┘                          │
│                            ▼                                         │
│                  ┌─────────────────────┐                             │
│                  │  Guide Pipeline     │                             │
│                  │  (orchestrator)     │                             │
│                  └─────────┬───────────┘                             │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  MySQL (via Prisma) │
                    │                    │
                    │  guides            │
                    │  guide_content     │
                    │  flashcards        │
                    │  quiz_questions    │
                    │  revision_sheets   │
                    └────────────────────┘
```

### Directory Structure (Phase 2 Additions)

```
src/
├── controllers/
│   └── guideController.ts          # Phase 2: guide generation handlers
├── services/
│   ├── extractionService.ts        # PDF, notes, YouTube extraction
│   ├── groqService.ts              # Groq API client + prompt builder
│   ├── guideGenerationService.ts   # Orchestrates extraction → AI → DB
│   └── cacheService.ts             # In-memory + DB caching
├── middleware/
│   ├── auth.ts                     # Phase 1 (existing)
│   ├── upload.ts                   # Multer config (Phase 2)
│   └── rateLimiter.ts              # Phase 2: Groq rate limiting
├── validators/
│   └── aiResponseValidator.ts      # Validates Groq JSON output
├── routes/
│   └── guides.ts                   # Phase 2 routes appended here
├── types/
│   └── guide.types.ts              # TypeScript interfaces for all guide data
└── utils/
    ├── textCleaner.ts              # Content normalization utilities
    └── youtubeUtils.ts             # URL parsing, transcript fetching
```

---

## 3. Input Processing Flow

Each of the three input types follows the same high-level pipeline but diverges in the extraction step:

```
User Request
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ 1. AUTH CHECK (JWT middleware from Phase 1)            │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 2. CACHE CHECK                                         │
│    Hash source → check guide_content table             │
│    If hit: return stored guide immediately             │
└────────────────────────┬───────────────────────────────┘
                         │ (cache miss)
                         ▼
┌────────────────────────────────────────────────────────┐
│ 3. SOURCE EXTRACTION                                   │
│    PDF   → pdf-parse → raw text                        │
│    Notes → sanitize input → raw text                   │
│    YouTube → fetch transcript → raw text               │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 4. CONTENT CLEANING                                    │
│    Remove noise, normalize whitespace, truncate to     │
│    Groq's context window limit (~6000 tokens safe)     │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 5. GROQ AI GENERATION (single structured prompt)       │
│    Returns JSON with all 11 output fields              │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 6. RESPONSE VALIDATION                                 │
│    Validate JSON schema, fill missing fields safely    │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 7. PERSIST TO MYSQL                                    │
│    guides + guide_content + flashcards + quiz +        │
│    revision_sheets — all in a Prisma transaction       │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 8. RETURN RESPONSE TO FRONTEND                         │
│    Full guide object with all generated fields         │
└────────────────────────────────────────────────────────┘
```

---

## 4. PDF Extraction API

### Dependencies

```bash
npm install multer pdf-parse
npm install --save-dev @types/multer @types/pdf-parse
```

### Multer Upload Middleware

```typescript
// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage(); // Store in memory buffer, not disk

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

export const pdfUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});
```

### PDF Extraction Service

```typescript
// src/services/extractionService.ts (PDF section)
import pdfParse from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length < 10) {
      throw new Error('PDF appears to be empty or contains only images. Please upload a text-based PDF.');
    }

    return data.text;
  } catch (error: any) {
    if (error.message.includes('Only PDF')) throw error;
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

export function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; wordCount: number }> {
  return pdfParse(buffer).then(data => ({
    pages: data.numpages,
    wordCount: data.text.split(/\s+/).filter(Boolean).length,
  }));
}
```

---

## 5. Notes Processing API

### Notes Extraction Service

```typescript
// src/services/extractionService.ts (Notes section)

export function extractTextFromNotes(rawNotes: string): string {
  if (!rawNotes || rawNotes.trim().length < 20) {
    throw new Error('Notes are too short. Please paste at least a few sentences.');
  }

  if (rawNotes.length > 50000) {
    throw new Error('Notes exceed maximum length of 50,000 characters. Please split into multiple guides.');
  }

  return rawNotes.trim();
}

export function sanitizeNotes(text: string): string {
  return text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')             // Tabs to spaces
    .replace(/[^\x20-\x7E\n]/g, ' ') // Remove non-printable ASCII (keep newlines)
    .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines
    .replace(/ {2,}/g, ' ')           // Collapse multiple spaces
    .trim();
}
```

---

## 6. YouTube Transcript API

### Dependencies

```bash
npm install youtube-transcript
npm install --save-dev @types/node
```

> **Note:** The `youtube-transcript` npm package fetches auto-generated or manual captions without requiring a YouTube Data API key. If this package becomes rate-limited or unreliable, the fallback is `@distube/ytdl-core` for audio download + Whisper/Groq for transcription, but that is overkill for this phase.

### YouTube Extraction Service

```typescript
// src/services/extractionService.ts (YouTube section)
import { YoutubeTranscript } from 'youtube-transcript';

export function parseYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractTextFromYouTube(url: string): Promise<string> {
  const videoId = parseYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...');
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript available for this video. The video may have captions disabled or be unavailable in your region.');
    }

    // Combine all transcript segments into clean text
    const fullText = transcriptItems
      .map(item => item.text.trim())
      .filter(text => text.length > 0)
      .join(' ');

    if (fullText.length < 50) {
      throw new Error('Transcript is too short to generate a meaningful guide.');
    }

    return fullText;
  } catch (error: any) {
    if (error.message.includes('transcript') || error.message.includes('captions')) {
      throw error;
    }
    throw new Error(`Failed to fetch YouTube transcript: ${error.message}`);
  }
}
```

---

## 7. Groq Client Setup

### Dependencies

```bash
npm install groq-sdk
```

### Environment Variables

Add to `.env`:

```env
# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=4096
GROQ_TEMPERATURE=0.3

# Rate limiting (requests per minute — Groq free tier: 30 RPM)
GROQ_RPM_LIMIT=25
```

### Groq Service

```typescript
// src/services/groqService.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || '4096');
const TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.3');

// Safe token limit for input (leave room for system prompt + response)
const MAX_INPUT_CHARS = 12000;

export function truncateToTokenLimit(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  
  // Truncate and add a clear note
  return text.substring(0, MAX_INPUT_CHARS) + 
    '\n\n[Content truncated to fit processing limits. The above represents the main content.]';
}

export async function generateGuideWithGroq(cleanedContent: string): Promise<string> {
  const truncated = truncateToTokenLimit(cleanedContent);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(truncated);

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned an empty response. Please try again.');
  }

  return content;
}
```

---

## 8. Prompt Design

The system uses a **single structured prompt** approach — one Groq call produces all 11 output fields as a JSON object. This minimises API calls (important for free-tier rate limits) and ensures consistency across related outputs.

### System Prompt

```typescript
// src/services/groqService.ts (continued)

function buildSystemPrompt(): string {
  return `You are StudyPilot, an expert educational assistant specialising in generating comprehensive study materials.

Your task is to analyse provided educational content and produce a fully structured JSON study guide.

STRICT RULES:
1. Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation.
2. Do not wrap the JSON in code blocks (\`\`\`). Return raw JSON only.
3. All string values must be properly escaped (no unescaped quotes inside strings).
4. Arrays must never be empty — always include at least one item.
5. If content is insufficient for a field, provide a reasonable placeholder.
6. Generate exactly 10 flashcards, 5 quiz questions, and a complete revision sheet.
7. Quiz questions must be multiple-choice with exactly 4 options each.
8. Always identify the correct answer index (0-3) for quiz questions.`;
}
```

### User Prompt

```typescript
function buildUserPrompt(content: string): string {
  return `Analyse the following educational content and generate a complete study guide.

CONTENT:
${content}

Return a JSON object with EXACTLY this structure (all fields required):

{
  "shortSummary": "string (2-3 sentences summarising the core topic)",
  "detailedSummary": "string (4-6 paragraphs covering main ideas, context, and implications)",
  "cleanedContent": "string (the content cleaned up: fix grammar, remove filler words, improve readability — keep all information intact)",
  "keyConcepts": [
    {
      "term": "string",
      "definition": "string (clear, concise definition)"
    }
  ],
  "topics": ["string", "string"],
  "topicHierarchy": [
    {
      "topic": "string (main topic)",
      "subtopics": ["string", "string"]
    }
  ],
  "metadata": {
    "estimatedReadingTime": "string (e.g. '8 minutes')",
    "difficulty": "beginner | intermediate | advanced",
    "subject": "string (primary subject area)",
    "language": "string (detected language, e.g. 'English')"
  },
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "difficulty": "easy | medium | hard"
    }
  ],
  "quizQuestions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": 0,
      "explanation": "string (why this answer is correct)"
    }
  ],
  "revisionSheet": {
    "title": "string",
    "sections": [
      {
        "heading": "string",
        "bulletPoints": ["string", "string"]
      }
    ]
  }
}`;
}
```

---

## 9. JSON Response Validation

Groq's response must be validated before saving. This prevents corrupt data from reaching the database.

```typescript
// src/validators/aiResponseValidator.ts

export interface GeneratedGuideData {
  shortSummary: string;
  detailedSummary: string;
  cleanedContent: string;
  keyConcepts: Array<{ term: string; definition: string }>;
  topics: string[];
  topicHierarchy: Array<{ topic: string; subtopics: string[] }>;
  metadata: {
    estimatedReadingTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    subject: string;
    language: string;
  };
  flashcards: Array<{ question: string; answer: string; difficulty: 'easy' | 'medium' | 'hard' }>;
  quizQuestions: Array<{
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>;
  revisionSheet: {
    title: string;
    sections: Array<{ heading: string; bulletPoints: string[] }>;
  };
}

export function parseAndValidateGroqResponse(rawResponse: string): GeneratedGuideData {
  // Strip any accidental markdown fences
  let jsonString = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseError) {
    // Try to extract JSON from the response if it's wrapped in text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('AI returned malformed JSON. Please try again.');
      }
    } else {
      throw new Error('AI response did not contain valid JSON. Please try again.');
    }
  }

  return sanitizeGuideData(parsed);
}

function sanitizeGuideData(data: any): GeneratedGuideData {
  return {
    shortSummary: ensureString(data.shortSummary, 'Summary not available.'),
    detailedSummary: ensureString(data.detailedSummary, 'Detailed summary not available.'),
    cleanedContent: ensureString(data.cleanedContent, ''),
    keyConcepts: ensureArray(data.keyConcepts).map(c => ({
      term: ensureString(c.term, 'Unknown term'),
      definition: ensureString(c.definition, 'Definition not available.'),
    })),
    topics: ensureArray(data.topics).map(t => ensureString(t, '')).filter(Boolean),
    topicHierarchy: ensureArray(data.topicHierarchy).map(h => ({
      topic: ensureString(h.topic, 'Topic'),
      subtopics: ensureArray(h.subtopics).map(s => ensureString(s, '')).filter(Boolean),
    })),
    metadata: {
      estimatedReadingTime: ensureString(data.metadata?.estimatedReadingTime, 'Unknown'),
      difficulty: validateDifficulty(data.metadata?.difficulty),
      subject: ensureString(data.metadata?.subject, 'General'),
      language: ensureString(data.metadata?.language, 'English'),
    },
    flashcards: ensureArray(data.flashcards).map(f => ({
      question: ensureString(f.question, 'Question not available.'),
      answer: ensureString(f.answer, 'Answer not available.'),
      difficulty: validateCardDifficulty(f.difficulty),
    })),
    quizQuestions: ensureArray(data.quizQuestions).map(q => ({
      question: ensureString(q.question, 'Question not available.'),
      options: ensureArray(q.options).map(o => ensureString(o, '')).filter(Boolean),
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: ensureString(q.explanation, 'No explanation provided.'),
    })),
    revisionSheet: {
      title: ensureString(data.revisionSheet?.title, 'Revision Sheet'),
      sections: ensureArray(data.revisionSheet?.sections).map(s => ({
        heading: ensureString(s.heading, 'Section'),
        bulletPoints: ensureArray(s.bulletPoints).map(b => ensureString(b, '')).filter(Boolean),
      })),
    },
  };
}

function ensureString(value: any, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  return [];
}

function validateDifficulty(value: any): 'beginner' | 'intermediate' | 'advanced' {
  if (['beginner', 'intermediate', 'advanced'].includes(value)) return value;
  return 'intermediate';
}

function validateCardDifficulty(value: any): 'easy' | 'medium' | 'hard' {
  if (['easy', 'medium', 'hard'].includes(value)) return value;
  return 'medium';
}
```

---

## 10. Guide Generation Pipeline

The pipeline orchestrates the entire flow in a single service function:

```typescript
// src/services/guideGenerationService.ts
import { prisma } from '../lib/prisma';
import { extractTextFromPDF, extractTextFromNotes, extractTextFromYouTube, sanitizeNotes } from './extractionService';
import { generateGuideWithGroq, truncateToTokenLimit } from './groqService';
import { parseAndValidateGroqResponse } from '../validators/aiResponseValidator';
import crypto from 'crypto';

export type SourceType = 'pdf' | 'notes' | 'youtube';

interface PipelineInput {
  userId: string;
  sourceType: SourceType;
  title?: string;
  // One of the following:
  pdfBuffer?: Buffer;
  notesText?: string;
  youtubeUrl?: string;
}

export async function generateGuide(input: PipelineInput) {
  // Step 1: Extract raw content
  let rawContent: string;
  let sourceIdentifier: string;

  switch (input.sourceType) {
    case 'pdf':
      rawContent = await extractTextFromPDF(input.pdfBuffer!);
      sourceIdentifier = crypto.createHash('md5').update(input.pdfBuffer!).digest('hex');
      break;
    case 'notes':
      rawContent = extractTextFromNotes(input.notesText!);
      sourceIdentifier = crypto.createHash('md5').update(rawContent).digest('hex');
      break;
    case 'youtube':
      rawContent = await extractTextFromYouTube(input.youtubeUrl!);
      sourceIdentifier = input.youtubeUrl!;
      break;
    default:
      throw new Error('Invalid source type');
  }

  // Step 2: Check cache (same user + same source)
  const existingGuide = await prisma.guide.findFirst({
    where: {
      userId: input.userId,
      sourceIdentifier,
    },
    include: {
      content: true,
      flashcards: true,
      quizQuestions: true,
      revisionSheet: { include: { sections: true } },
    },
  });

  if (existingGuide) {
    return { guide: existingGuide, cached: true };
  }

  // Step 3: Clean content
  const cleanedRaw = sanitizeNotes(rawContent);
  const contentForAI = truncateToTokenLimit(cleanedRaw);

  // Step 4: Generate with Groq
  const groqRawResponse = await generateGuideWithGroq(contentForAI);

  // Step 5: Validate
  const validated = parseAndValidateGroqResponse(groqRawResponse);

  // Step 6: Persist everything in a transaction
  const guide = await prisma.$transaction(async (tx) => {
    // Create the main guide record
    const guide = await tx.guide.create({
      data: {
        userId: input.userId,
        title: input.title || validated.metadata.subject || 'Untitled Guide',
        sourceType: input.sourceType,
        sourceIdentifier,
        youtubeUrl: input.youtubeUrl,
        status: 'completed',
      },
    });

    // Create guide content
    await tx.guideContent.create({
      data: {
        guideId: guide.id,
        rawContent,
        cleanedContent: validated.cleanedContent || cleanedRaw,
        shortSummary: validated.shortSummary,
        detailedSummary: validated.detailedSummary,
        keyConcepts: JSON.stringify(validated.keyConcepts),
        topics: JSON.stringify(validated.topics),
        topicHierarchy: JSON.stringify(validated.topicHierarchy),
        metadata: JSON.stringify({
          ...validated.metadata,
          wordCount: rawContent.split(/\s+/).length,
          sourceType: input.sourceType,
        }),
      },
    });

    // Create flashcards
    if (validated.flashcards.length > 0) {
      await tx.flashcard.createMany({
        data: validated.flashcards.map((fc, idx) => ({
          guideId: guide.id,
          question: fc.question,
          answer: fc.answer,
          difficulty: fc.difficulty,
          orderIndex: idx,
        })),
      });
    }

    // Create quiz questions
    if (validated.quizQuestions.length > 0) {
      await tx.quizQuestion.createMany({
        data: validated.quizQuestions.map((q, idx) => ({
          guideId: guide.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          orderIndex: idx,
        })),
      });
    }

    // Create revision sheet
    const revSheet = await tx.revisionSheet.create({
      data: {
        guideId: guide.id,
        title: validated.revisionSheet.title,
      },
    });

    if (validated.revisionSheet.sections.length > 0) {
      await tx.revisionSection.createMany({
        data: validated.revisionSheet.sections.map((s, idx) => ({
          revisionSheetId: revSheet.id,
          heading: s.heading,
          bulletPoints: JSON.stringify(s.bulletPoints),
          orderIndex: idx,
        })),
      });
    }

    return guide;
  });

  // Step 7: Return full guide with all relations
  return {
    guide: await prisma.guide.findUnique({
      where: { id: guide.id },
      include: {
        content: true,
        flashcards: { orderBy: { orderIndex: 'asc' } },
        quizQuestions: { orderBy: { orderIndex: 'asc' } },
        revisionSheet: { include: { sections: { orderBy: { orderIndex: 'asc' } } } },
      },
    }),
    cached: false,
  };
}
```

---

## 11. MySQL Tables

Run these migrations after updating the Prisma schema in Section 12.

```sql
-- guides table (may already exist from Phase 1 — add new columns)
ALTER TABLE guides
  ADD COLUMN source_type ENUM('pdf', 'notes', 'youtube') NOT NULL DEFAULT 'notes',
  ADD COLUMN source_identifier VARCHAR(512) DEFAULT NULL,
  ADD COLUMN youtube_url TEXT DEFAULT NULL,
  ADD COLUMN status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  ADD INDEX idx_guides_user_source (user_id, source_identifier);

-- guide_content table (new)
CREATE TABLE guide_content (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  guide_id VARCHAR(36) NOT NULL,
  raw_content LONGTEXT NOT NULL,
  cleaned_content LONGTEXT,
  short_summary TEXT,
  detailed_summary LONGTEXT,
  key_concepts JSON,
  topics JSON,
  topic_hierarchy JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guide_content (guide_id),
  CONSTRAINT fk_guide_content_guide FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- flashcards table (new)
CREATE TABLE flashcards (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  guide_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_flashcards_guide (guide_id),
  CONSTRAINT fk_flashcards_guide FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- quiz_questions table (new)
CREATE TABLE quiz_questions (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  guide_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer_index TINYINT NOT NULL,
  explanation TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quiz_guide (guide_id),
  CONSTRAINT fk_quiz_guide FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- revision_sheets table (new)
CREATE TABLE revision_sheets (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  guide_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_revision_guide (guide_id),
  CONSTRAINT fk_revision_guide FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- revision_sections table (new)
CREATE TABLE revision_sections (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  revision_sheet_id VARCHAR(36) NOT NULL,
  heading VARCHAR(255) NOT NULL,
  bullet_points JSON NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  INDEX idx_revision_sections_sheet (revision_sheet_id),
  CONSTRAINT fk_revision_sections_sheet FOREIGN KEY (revision_sheet_id) REFERENCES revision_sheets(id) ON DELETE CASCADE
);
```

---

## 12. Prisma Models

Add these to `prisma/schema.prisma`. The `Guide` model likely already exists from Phase 1 — update it with the new fields and relations.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── Phase 1 (existing — update with new fields) ──────────────────────────

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  guides    Guide[]

  @@map("users")
}

// ─── Phase 2 ──────────────────────────────────────────────────────────────

model Guide {
  id               String      @id @default(uuid())
  userId           String      @map("user_id")
  title            String
  sourceType       SourceType  @map("source_type")
  sourceIdentifier String?     @map("source_identifier") @db.VarChar(512)
  youtubeUrl       String?     @map("youtube_url") @db.Text
  status           GuideStatus @default(pending)
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  content       GuideContent?
  flashcards    Flashcard[]
  quizQuestions QuizQuestion[]
  revisionSheet RevisionSheet?

  @@index([userId, sourceIdentifier], name: "idx_guides_user_source")
  @@map("guides")
}

enum SourceType {
  pdf
  notes
  youtube
}

enum GuideStatus {
  pending
  processing
  completed
  failed
}

model GuideContent {
  id              String   @id @default(uuid())
  guideId         String   @unique @map("guide_id")
  rawContent      String   @map("raw_content") @db.LongText
  cleanedContent  String?  @map("cleaned_content") @db.LongText
  shortSummary    String?  @map("short_summary") @db.Text
  detailedSummary String?  @map("detailed_summary") @db.LongText
  keyConcepts     Json?    @map("key_concepts")
  topics          Json?
  topicHierarchy  Json?    @map("topic_hierarchy")
  metadata        Json?
  createdAt       DateTime @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@map("guide_content")
}

model Flashcard {
  id         String          @id @default(uuid())
  guideId    String          @map("guide_id")
  question   String          @db.Text
  answer     String          @db.Text
  difficulty CardDifficulty  @default(medium)
  orderIndex Int             @default(0) @map("order_index")
  createdAt  DateTime        @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@index([guideId], name: "idx_flashcards_guide")
  @@map("flashcards")
}

enum CardDifficulty {
  easy
  medium
  hard
}

model QuizQuestion {
  id                 String   @id @default(uuid())
  guideId            String   @map("guide_id")
  question           String   @db.Text
  options            Json
  correctAnswerIndex Int      @map("correct_answer_index") @db.TinyInt
  explanation        String?  @db.Text
  orderIndex         Int      @default(0) @map("order_index")
  createdAt          DateTime @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@index([guideId], name: "idx_quiz_guide")
  @@map("quiz_questions")
}

model RevisionSheet {
  id        String            @id @default(uuid())
  guideId   String            @unique @map("guide_id")
  title     String
  createdAt DateTime          @default(now()) @map("created_at")
  sections  RevisionSection[]

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@map("revision_sheets")
}

model RevisionSection {
  id              String   @id @default(uuid())
  revisionSheetId String   @map("revision_sheet_id")
  heading         String
  bulletPoints    Json     @map("bullet_points")
  orderIndex      Int      @default(0) @map("order_index")

  revisionSheet RevisionSheet @relation(fields: [revisionSheetId], references: [id], onDelete: Cascade)

  @@index([revisionSheetId], name: "idx_revision_sections_sheet")
  @@map("revision_sections")
}
```

After updating the schema, run:

```bash
npx prisma migrate dev --name phase2_guide_generation
npx prisma generate
```

---

## 13. API Endpoints

All endpoints require the `Authorization: Bearer <token>` header from Phase 1 JWT auth.

### Controller

```typescript
// src/controllers/guideController.ts
import { Request, Response } from 'express';
import { generateGuide } from '../services/guideGenerationService';
import { prisma } from '../lib/prisma';

// POST /api/guides/generate/pdf
export async function generateFromPDF(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No PDF file uploaded.' });

    const { title } = req.body;
    const userId = req.user.id; // From Phase 1 JWT middleware

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'pdf',
      title,
      pdfBuffer: file.buffer,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/guides/generate/notes
export async function generateFromNotes(req: Request, res: Response) {
  try {
    const { notes, title } = req.body;
    if (!notes) return res.status(400).json({ error: 'Notes content is required.' });

    const userId = req.user.id;

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'notes',
      title,
      notesText: notes,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/guides/generate/youtube
export async function generateFromYouTube(req: Request, res: Response) {
  try {
    const { url, title } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL is required.' });

    const userId = req.user.id;

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'youtube',
      title,
      youtubeUrl: url,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/guides
export async function getUserGuides(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const guides = await prisma.guide.findMany({
      where: { userId, status: 'completed' },
      include: { content: { select: { shortSummary: true, metadata: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.guide.count({ where: { userId } });

    return res.json({
      success: true,
      guides,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/guides/:id
export async function getGuideById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const guide = await prisma.guide.findFirst({
      where: { id, userId },
      include: {
        content: true,
        flashcards: { orderBy: { orderIndex: 'asc' } },
        quizQuestions: { orderBy: { orderIndex: 'asc' } },
        revisionSheet: { include: { sections: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    if (!guide) return res.status(404).json({ error: 'Guide not found.' });

    return res.json({ success: true, guide: formatGuideResponse(guide) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/guides/:id/flashcards
export async function getFlashcards(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json({ error: 'Guide not found.' });

    const flashcards = await prisma.flashcard.findMany({
      where: { guideId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return res.json({ success: true, flashcards });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/guides/:id/quiz
export async function getQuizQuestions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json({ error: 'Guide not found.' });

    const questions = await prisma.quizQuestion.findMany({
      where: { guideId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return res.json({
      success: true,
      questions: questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/guides/:id/revision
export async function getRevisionSheet(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json({ error: 'Guide not found.' });

    const revisionSheet = await prisma.revisionSheet.findUnique({
      where: { guideId: id },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!revisionSheet) return res.status(404).json({ error: 'Revision sheet not found.' });

    return res.json({
      success: true,
      revisionSheet: {
        ...revisionSheet,
        sections: revisionSheet.sections.map(s => ({
          ...s,
          bulletPoints: typeof s.bulletPoints === 'string' ? JSON.parse(s.bulletPoints) : s.bulletPoints,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /api/guides/:id
export async function deleteGuide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json({ error: 'Guide not found.' });

    await prisma.guide.delete({ where: { id } }); // Cascades to all related tables

    return res.json({ success: true, message: 'Guide deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper: format guide for API response
function formatGuideResponse(guide: any) {
  if (!guide) return null;
  return {
    ...guide,
    content: guide.content
      ? {
          ...guide.content,
          keyConcepts: parseJson(guide.content.keyConcepts),
          topics: parseJson(guide.content.topics),
          topicHierarchy: parseJson(guide.content.topicHierarchy),
          metadata: parseJson(guide.content.metadata),
        }
      : null,
    quizQuestions: guide.quizQuestions?.map((q: any) => ({
      ...q,
      options: parseJson(q.options),
    })),
    revisionSheet: guide.revisionSheet
      ? {
          ...guide.revisionSheet,
          sections: guide.revisionSheet.sections?.map((s: any) => ({
            ...s,
            bulletPoints: parseJson(s.bulletPoints),
          })),
        }
      : null,
  };
}

function parseJson(value: any) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}
```

### Routes

```typescript
// src/routes/guides.ts (append Phase 2 routes to existing file)
import { Router } from 'express';
import { authenticate } from '../middleware/auth'; // Phase 1
import { pdfUpload } from '../middleware/upload';
import { groqRateLimiter } from '../middleware/rateLimiter';
import {
  generateFromPDF,
  generateFromNotes,
  generateFromYouTube,
  getUserGuides,
  getGuideById,
  getFlashcards,
  getQuizQuestions,
  getRevisionSheet,
  deleteGuide,
} from '../controllers/guideController';

const router = Router();

// All routes require auth
router.use(authenticate);

// Generation endpoints (rate limited)
router.post('/generate/pdf', groqRateLimiter, pdfUpload.single('pdf'), generateFromPDF);
router.post('/generate/notes', groqRateLimiter, generateFromNotes);
router.post('/generate/youtube', groqRateLimiter, generateFromYouTube);

// Retrieval endpoints (no rate limit needed)
router.get('/', getUserGuides);
router.get('/:id', getGuideById);
router.get('/:id/flashcards', getFlashcards);
router.get('/:id/quiz', getQuizQuestions);
router.get('/:id/revision', getRevisionSheet);
router.delete('/:id', deleteGuide);

export default router;
```

### Endpoint Summary

| Method | Endpoint | Auth | Body/Params | Description |
|---|---|---|---|---|
| `POST` | `/api/guides/generate/pdf` | JWT | `multipart: pdf file, title?` | Generate guide from PDF upload |
| `POST` | `/api/guides/generate/notes` | JWT | `{ notes, title? }` | Generate guide from pasted text |
| `POST` | `/api/guides/generate/youtube` | JWT | `{ url, title? }` | Generate guide from YouTube video |
| `GET` | `/api/guides` | JWT | `?page=1&limit=10` | List user's guides (paginated) |
| `GET` | `/api/guides/:id` | JWT | — | Get full guide with all content |
| `GET` | `/api/guides/:id/flashcards` | JWT | — | Get flashcards for a guide |
| `GET` | `/api/guides/:id/quiz` | JWT | — | Get quiz questions for a guide |
| `GET` | `/api/guides/:id/revision` | JWT | — | Get revision sheet for a guide |
| `DELETE` | `/api/guides/:id` | JWT | — | Delete guide and all related data |

---

## 14. Example Request/Response JSON

### POST `/api/guides/generate/notes`

**Request:**
```json
{
  "notes": "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of glucose. The process occurs in the chloroplasts and involves two stages: the light-dependent reactions and the Calvin cycle. In the light-dependent reactions, water molecules are split and oxygen is released. The Calvin cycle uses the energy from the first stage to convert CO2 into glucose.",
  "title": "Photosynthesis Study Guide"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "cached": false,
  "guide": {
    "id": "a3f8b2c1-d4e5-4f67-a890-b1c2d3e4f567",
    "userId": "u7g8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2",
    "title": "Photosynthesis Study Guide",
    "sourceType": "notes",
    "sourceIdentifier": "d41d8cd98f00b204e9800998ecf8427e",
    "status": "completed",
    "createdAt": "2024-11-15T10:30:00.000Z",
    "updatedAt": "2024-11-15T10:30:05.000Z",
    "content": {
      "id": "c1d2e3f4-...",
      "guideId": "a3f8b2c1-...",
      "rawContent": "Photosynthesis is the process by which plants use sunlight...",
      "cleanedContent": "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen. This occurs in chloroplasts through two stages: light-dependent reactions and the Calvin cycle.",
      "shortSummary": "Photosynthesis is the biological process plants use to convert sunlight, water, and CO2 into glucose and oxygen. It occurs in two stages within chloroplasts: light-dependent reactions and the Calvin cycle.",
      "detailedSummary": "Photosynthesis is one of the most fundamental processes in biology...",
      "keyConcepts": [
        { "term": "Photosynthesis", "definition": "The process by which plants convert light energy into chemical energy stored as glucose." },
        { "term": "Chloroplast", "definition": "The organelle in plant cells where photosynthesis takes place." },
        { "term": "Calvin Cycle", "definition": "The light-independent stage of photosynthesis where CO2 is fixed into organic molecules." }
      ],
      "topics": ["Photosynthesis", "Chloroplasts", "Light Reactions", "Calvin Cycle", "Glucose Production"],
      "topicHierarchy": [
        {
          "topic": "Photosynthesis",
          "subtopics": ["Light-Dependent Reactions", "Light-Independent Reactions (Calvin Cycle)"]
        }
      ],
      "metadata": {
        "estimatedReadingTime": "3 minutes",
        "difficulty": "intermediate",
        "subject": "Biology",
        "language": "English",
        "wordCount": 87,
        "sourceType": "notes"
      }
    },
    "flashcards": [
      {
        "id": "fc1...",
        "question": "What are the two main stages of photosynthesis?",
        "answer": "The light-dependent reactions and the Calvin cycle (light-independent reactions).",
        "difficulty": "easy",
        "orderIndex": 0
      },
      {
        "id": "fc2...",
        "question": "In which organelle does photosynthesis occur?",
        "answer": "Chloroplasts.",
        "difficulty": "easy",
        "orderIndex": 1
      }
    ],
    "quizQuestions": [
      {
        "id": "qq1...",
        "question": "What are the three raw materials required for photosynthesis?",
        "options": [
          "Sunlight, oxygen, and glucose",
          "Sunlight, water, and carbon dioxide",
          "Water, nitrogen, and sunlight",
          "Carbon dioxide, glucose, and water"
        ],
        "correctAnswerIndex": 1,
        "explanation": "Photosynthesis requires sunlight (energy source), water (electron donor), and CO2 (carbon source) to produce glucose and oxygen.",
        "orderIndex": 0
      }
    ],
    "revisionSheet": {
      "id": "rs1...",
      "title": "Photosynthesis Revision Sheet",
      "sections": [
        {
          "id": "rsec1...",
          "heading": "Core Definition",
          "bulletPoints": [
            "Photosynthesis converts sunlight + water + CO2 → glucose + oxygen",
            "Occurs in chloroplasts of plant cells",
            "Equation: 6CO2 + 6H2O + light → C6H12O6 + 6O2"
          ],
          "orderIndex": 0
        },
        {
          "id": "rsec2...",
          "heading": "Two Stages",
          "bulletPoints": [
            "Light-dependent reactions: occur in thylakoid membranes, split water, release O2, produce ATP/NADPH",
            "Calvin Cycle (light-independent): occurs in stroma, uses ATP/NADPH to fix CO2 into glucose"
          ],
          "orderIndex": 1
        }
      ]
    }
  }
}
```

### GET `/api/guides` (paginated list)

**Response (200 OK):**
```json
{
  "success": true,
  "guides": [
    {
      "id": "a3f8b2c1-...",
      "title": "Photosynthesis Study Guide",
      "sourceType": "notes",
      "status": "completed",
      "createdAt": "2024-11-15T10:30:00.000Z",
      "content": {
        "shortSummary": "Photosynthesis is the biological process...",
        "metadata": { "subject": "Biology", "difficulty": "intermediate", "estimatedReadingTime": "3 minutes" }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 15. Frontend Integration Guide

The React/TypeScript frontend is already built. This section documents the exact API contract the backend must honour.

### TypeScript Interfaces (match these exactly)

```typescript
// These types should match what the frontend already uses

export interface Guide {
  id: string;
  userId: string;
  title: string;
  sourceType: 'pdf' | 'notes' | 'youtube';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  content?: GuideContent;
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
  revisionSheet?: RevisionSheet;
}

export interface GuideContent {
  id: string;
  rawContent: string;
  cleanedContent: string;
  shortSummary: string;
  detailedSummary: string;
  keyConcepts: Array<{ term: string; definition: string }>;
  topics: string[];
  topicHierarchy: Array<{ topic: string; subtopics: string[] }>;
  metadata: {
    estimatedReadingTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    subject: string;
    language: string;
    wordCount: number;
    sourceType: string;
  };
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  orderIndex: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  orderIndex: number;
}

export interface RevisionSheet {
  id: string;
  title: string;
  sections: Array<{
    id: string;
    heading: string;
    bulletPoints: string[];
    orderIndex: number;
  }>;
}
```

### API Client Calls (frontend reference)

```typescript
// Frontend API service reference (already implemented in React — do not modify)

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Generate from PDF
const generateFromPDF = async (file: File, title?: string) => {
  const formData = new FormData();
  formData.append('pdf', file);
  if (title) formData.append('title', title);
  
  const res = await fetch(`${API_BASE}/guides/generate/pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
};

// Generate from notes
const generateFromNotes = async (notes: string, title?: string) => {
  const res = await fetch(`${API_BASE}/guides/generate/notes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, title }),
  });
  return res.json();
};

// Generate from YouTube
const generateFromYouTube = async (url: string, title?: string) => {
  const res = await fetch(`${API_BASE}/guides/generate/youtube`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title }),
  });
  return res.json();
};
```

### CORS Configuration

Ensure the existing Express CORS setup allows the React dev server:

```typescript
// In main app.ts / server.ts (update existing CORS config)
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',      // React dev server
    'http://localhost:5173',      // Vite dev server
    process.env.FRONTEND_URL!,   // Production URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 16. Error Handling

### Standardised Error Response Format

All errors must follow this format so the frontend can handle them consistently:

```typescript
// Error response shape (match what frontend expects)
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",      // Optional machine-readable code
  "details": {}              // Optional extra context
}
```

### Global Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err.message?.includes('Only PDF')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }

  // Groq API errors
  if (err.status === 429 || err.message?.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      error: 'AI service is temporarily busy. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    });
  }

  if (err.status >= 500 && err.message?.includes('groq')) {
    return res.status(503).json({
      success: false,
      error: 'AI service is temporarily unavailable. Please try again in a few minutes.',
      code: 'AI_UNAVAILABLE',
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A guide from this source already exists.',
      code: 'DUPLICATE_GUIDE',
    });
  }

  // App errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Default
  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
  });
}
```

### Error Codes Reference

| Code | Status | Cause |
|---|---|---|
| `INVALID_FILE_TYPE` | 400 | Non-PDF file uploaded |
| `FILE_TOO_LARGE` | 413 | PDF exceeds 10MB |
| `NOTES_TOO_SHORT` | 400 | Notes under 20 characters |
| `INVALID_YOUTUBE_URL` | 400 | URL not parseable as YouTube |
| `TRANSCRIPT_UNAVAILABLE` | 422 | Video has no captions |
| `PDF_EMPTY` | 422 | PDF is image-only or blank |
| `AI_MALFORMED_RESPONSE` | 502 | Groq returned invalid JSON |
| `AI_UNAVAILABLE` | 503 | Groq service down |
| `RATE_LIMITED` | 429 | Too many requests |
| `GUIDE_NOT_FOUND` | 404 | Guide ID not found or not owned by user |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 17. Rate Limit Handling

### Groq Free Tier Limits

- Requests per minute (RPM): 30
- Tokens per minute (TPM): 14,400
- Tokens per day: 500,000

### Rate Limiter Middleware

```typescript
// src/middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter (use Redis in production)
const requestLog: Map<string, number[]> = new Map();

const RPM_LIMIT = parseInt(process.env.GROQ_RPM_LIMIT || '25'); // Stay below Groq's 30 RPM

export function groqRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const userRequests = requestLog.get(userId) || [];
  const recentRequests = userRequests.filter(ts => now - ts < windowMs);

  if (recentRequests.length >= RPM_LIMIT) {
    const oldestRequest = Math.min(...recentRequests);
    const retryAfterMs = windowMs - (now - oldestRequest);

    return res.status(429).json({
      success: false,
      error: `Too many guide generation requests. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    });
  }

  recentRequests.push(now);
  requestLog.set(userId, recentRequests);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, timestamps] of requestLog.entries()) {
      const fresh = timestamps.filter(ts => now - ts < windowMs);
      if (fresh.length === 0) requestLog.delete(key);
      else requestLog.set(key, fresh);
    }
  }

  next();
}
```

### Groq Retry Logic

```typescript
// src/services/groqService.ts (add retry wrapper)

export async function generateGuideWithGroqRetry(
  cleanedContent: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateGuideWithGroq(cleanedContent);
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
        console.warn(`[Groq] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

---

## 18. Caching Strategy

### Two-Level Cache

**Level 1 — Database cache (permanent):**  
Before invoking Groq, query MySQL for a guide with the same `userId` + `sourceIdentifier`. If found, return immediately. This is the primary cache — once generated, a guide is never re-generated unless explicitly deleted.

**Level 2 — In-memory cache (session-level):**  
Cache the full formatted guide response in memory for 5 minutes to avoid repeated DB queries for the same guide within a session.

```typescript
// src/services/cacheService.ts
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedGuide(cacheKey: string): any | null {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setCachedGuide(cacheKey: string, data: any): void {
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateCachedGuide(guideId: string, userId: string): void {
  memoryCache.delete(`guide:${userId}:${guideId}`);
}

// Cache key for individual guide
export function guideKey(userId: string, guideId: string): string {
  return `guide:${userId}:${guideId}`;
}
```

### Cache Flow in `getGuideById`

```typescript
// In guideController.ts — getGuideById (updated with cache)
export async function getGuideById(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user.id;
  const cacheKey = guideKey(userId, id);

  // Check memory cache first
  const cached = getCachedGuide(cacheKey);
  if (cached) {
    return res.json({ success: true, guide: cached, fromCache: true });
  }

  const guide = await prisma.guide.findFirst({
    where: { id, userId },
    include: { content: true, flashcards: true, quizQuestions: true, revisionSheet: { include: { sections: true } } },
  });

  if (!guide) return res.status(404).json({ error: 'Guide not found.' });

  const formatted = formatGuideResponse(guide);
  setCachedGuide(cacheKey, formatted);

  return res.json({ success: true, guide: formatted });
}
```

---

## 19. Testing Checklist

Use this checklist to verify Phase 2 is fully functional before handoff.

### PDF Extraction
- [ ] Upload a text-based PDF — guide is generated and persisted
- [ ] Upload the same PDF again — returns cached result (`cached: true`)
- [ ] Upload an image-only PDF — returns `PDF_EMPTY` error
- [ ] Upload a non-PDF file — returns `INVALID_FILE_TYPE` error
- [ ] Upload a PDF > 10MB — returns `FILE_TOO_LARGE` error

### Notes Processing
- [ ] Submit valid notes — guide is generated and persisted
- [ ] Submit the same notes again — returns cached result
- [ ] Submit fewer than 20 characters — returns `NOTES_TOO_SHORT` error
- [ ] Submit notes with special characters and Unicode — handled without crash

### YouTube Transcript
- [ ] Submit a valid `youtube.com/watch?v=` URL — transcript fetched and guide generated
- [ ] Submit a `youtu.be/` short URL — works correctly
- [ ] Submit a YouTube Shorts URL — works correctly
- [ ] Submit an invalid URL — returns `INVALID_YOUTUBE_URL` error
- [ ] Submit a URL for a video without captions — returns `TRANSCRIPT_UNAVAILABLE` error

### Groq Generation
- [ ] Generated guide contains all 11 output fields
- [ ] `keyConcepts` has at least 3 entries
- [ ] `flashcards` has exactly 10 entries
- [ ] `quizQuestions` has exactly 5 entries, each with 4 options
- [ ] `revisionSheet` has at least 2 sections with bullet points
- [ ] `topicHierarchy` is a valid nested structure
- [ ] JSON fields (keyConcepts, topics, options, bulletPoints) are parsed arrays in API response, not raw strings

### Database Persistence
- [ ] Guide record created in `guides` table
- [ ] Content saved in `guide_content` table
- [ ] Flashcards saved in `flashcards` table with correct `orderIndex`
- [ ] Quiz questions saved in `quiz_questions` table
- [ ] Revision sheet + sections saved in `revision_sheets` + `revision_sections` tables
- [ ] Deleting a guide cascades deletion to all related tables

### API Endpoints
- [ ] All endpoints return 401 without a valid JWT
- [ ] `GET /api/guides` returns paginated list for the authenticated user only
- [ ] `GET /api/guides/:id` returns 404 for another user's guide
- [ ] `DELETE /api/guides/:id` removes the guide and all related data
- [ ] `GET /api/guides/:id/flashcards`, `/quiz`, `/revision` return correct structured data

### Error Handling
- [ ] All errors return `{ success: false, error: "...", code: "..." }` format
- [ ] Rate limit returns 429 with `retryAfterSeconds`
- [ ] Server logs errors without exposing stack traces to the client in production

---

## 20. Completion Criteria

Phase 2 is considered **complete** when all of the following are true:

### Functional Criteria
1. ✅ A user can upload a PDF and receive a fully structured guide from the API
2. ✅ A user can paste notes and receive a fully structured guide from the API
3. ✅ A user can submit a YouTube URL and receive a fully structured guide from the API
4. ✅ Re-submitting the same source returns the cached guide without re-invoking Groq
5. ✅ All 11 output fields are populated and non-empty for each guide
6. ✅ All generated data is persisted in MySQL across all five related tables
7. ✅ The React frontend can fetch any guide by ID and receive the full structured response
8. ✅ Guide deletion cascades correctly to all related data

### Quality Criteria
9. ✅ All endpoints enforce JWT authentication
10. ✅ Rate limiting prevents abuse of the Groq API
11. ✅ All error states return meaningful, frontend-consumable error responses
12. ✅ The entire testing checklist (Section 19) passes without failures

### Integration Criteria
13. ✅ API response shapes match the TypeScript interfaces the frontend expects (Section 15)
14. ✅ CORS is configured to allow the frontend origin
15. ✅ Prisma migrations applied successfully and all tables exist in MySQL
16. ✅ `.env` variables are documented and server starts without missing env errors

---

*End of Backend Phase 2 Implementation Guide — StudyPilot AI*
