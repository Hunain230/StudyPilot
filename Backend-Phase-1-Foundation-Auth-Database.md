# StudyPilot AI — Backend Phase 1: Foundation, Auth & Database

> **Document Type:** Implementation-Ready Backend Specification  
> **Phase:** 1 of N  
> **Stack:** Node.js · Express.js · MySQL · Prisma ORM · JWT · bcrypt · Multer  
> **Frontend:** Already built (React + TypeScript `.tsx`)  
> **Prepared for:** Claude Code / Developer Handoff  

---

## Table of Contents

1. [Objective](#1-objective)
2. [System Architecture](#2-system-architecture)
3. [Backend Folder Structure](#3-backend-folder-structure)
4. [Environment Variables](#4-environment-variables)
5. [MySQL Database Design](#5-mysql-database-design)
6. [Prisma Schema](#6-prisma-schema)
7. [User Authentication Flow](#7-user-authentication-flow)
8. [Signup API](#8-signup-api)
9. [Login API](#9-login-api)
10. [JWT Middleware](#10-jwt-middleware)
11. [Protected Routes](#11-protected-routes)
12. [User Profile API](#12-user-profile-api)
13. [Guide Table Schema](#13-guide-table-schema)
14. [Uploaded Files Table Schema](#14-uploaded-files-table-schema)
15. [API Response Format](#15-api-response-format)
16. [Error Handling Format](#16-error-handling-format)
17. [Frontend Integration Guide](#17-frontend-integration-guide)
18. [Testing Checklist](#18-testing-checklist)
19. [Completion Criteria](#19-completion-criteria)

---

## 1. Objective

Build a production-grade **backend foundation** for StudyPilot AI that:

- Provides a RESTful API consumed by the **already-built React/TypeScript frontend**
- Handles **user registration, login, and JWT-based session management**
- Establishes the **MySQL database schema** via Prisma ORM to support all future AI features
- Implements **secure file upload infrastructure** (Multer) ready for PDF and resource ingestion
- Is **designed for extensibility** — every table and API endpoint is future-proofed for:
  - AI summary generation
  - Flashcards & quizzes
  - Weak topic analysis
  - Study planner
  - RAG (Retrieval-Augmented Generation) doubt solver
  - PDF export
  - Dashboard analytics

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Already Built)                │
│         React + TypeScript (.tsx) — Vite/CRA            │
│  Pages: Landing, Login, Signup, Dashboard, My Guides,   │
│         New Guide, Resources, History, Profile, etc.     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST (JSON)
                        │ Bearer Token (JWT)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Phase 1)                      │
│              Node.js + Express.js Server                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Auth Router │  │ Guide Router │  │ Upload Router │  │
│  │  /api/auth   │  │ /api/guides  │  │ /api/upload   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              JWT Middleware (authGuard)           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Prisma ORM  ←→  MySQL (Port 3306)        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │     Multer (File Storage) → /uploads/ directory  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 MySQL Database                           │
│         (Viewable via MySQL Workbench)                   │
│                                                          │
│  Tables: User, Guide, UploadedFile, Flashcard, Quiz,    │
│          StudySession, WeakTopic, StudyPlan, Message     │
└─────────────────────────────────────────────────────────┘
```

**Communication Protocol:**
- Frontend → Backend: `HTTP REST` with `JSON` bodies
- Auth: `Authorization: Bearer <JWT>` header on all protected routes
- File uploads: `multipart/form-data`
- CORS: configured for frontend origin (e.g., `http://localhost:5173`)

---

## 3. Backend Folder Structure

```
studypilot-backend/
│
├── prisma/
│   ├── schema.prisma              # Full Prisma schema (all tables)
│   └── migrations/                # Auto-generated migration history
│
├── src/
│   ├── index.ts                   # Entry point — Express app init
│   ├── app.ts                     # App setup — CORS, middleware, routes
│   │
│   ├── config/
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── env.ts                 # Validated env variable exports
│   │
│   ├── middleware/
│   │   ├── authGuard.ts           # JWT verification middleware
│   │   ├── errorHandler.ts        # Global error handler
│   │   └── validate.ts            # Request body validation helper
│   │
│   ├── routes/
│   │   ├── auth.routes.ts         # /api/auth — signup, login, me
│   │   ├── guide.routes.ts        # /api/guides — CRUD
│   │   ├── upload.routes.ts       # /api/upload — file upload
│   │   ├── flashcard.routes.ts    # /api/flashcards — (Phase 2)
│   │   ├── quiz.routes.ts         # /api/quizzes — (Phase 3)
│   │   ├── studyplan.routes.ts    # /api/study-plan — (Phase 4)
│   │   └── chat.routes.ts         # /api/chat — RAG doubt solver (Phase 5)
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts     # signup, login, getMe
│   │   ├── guide.controller.ts    # createGuide, getGuides, getGuide, deleteGuide
│   │   ├── upload.controller.ts   # uploadFile, getFiles
│   │   └── profile.controller.ts  # getProfile, updateProfile
│   │
│   ├── services/
│   │   ├── auth.service.ts        # Business logic for auth
│   │   ├── guide.service.ts       # Business logic for guides
│   │   └── upload.service.ts      # Multer config, file processing
│   │
│   ├── utils/
│   │   ├── jwt.ts                 # signToken, verifyToken helpers
│   │   ├── hash.ts                # hashPassword, comparePassword
│   │   ├── response.ts            # Standardized API response builder
│   │   └── logger.ts              # Console/file logger
│   │
│   └── types/
│       ├── express.d.ts           # Augment Request with req.user
│       └── api.types.ts           # Shared TS interfaces for API
│
├── uploads/                       # Multer file storage (gitignored)
│   ├── pdfs/
│   ├── images/
│   └── temp/
│
├── .env                           # Local environment variables
├── .env.example                   # Template for new developers
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Environment Variables

### `.env` (never commit this file)

```env
# ─── Server ────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ─── Database ──────────────────────────────────────────
DATABASE_URL="mysql://root:yourpassword@localhost:3306/studypilot"

# ─── JWT ───────────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=7d

# ─── bcrypt ────────────────────────────────────────────
BCRYPT_SALT_ROUNDS=12

# ─── CORS ──────────────────────────────────────────────
FRONTEND_ORIGIN=http://localhost:5173

# ─── File Uploads ──────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25

# ─── AI (Future Phases) ────────────────────────────────
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### `.env.example` (commit this)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="mysql://root:PASSWORD@localhost:3306/studypilot"
JWT_SECRET=REPLACE_WITH_STRONG_SECRET
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
FRONTEND_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25
OPENAI_API_KEY=
GEMINI_API_KEY=
```

### `src/config/env.ts`

```typescript
import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
};

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
};
```

---

## 5. MySQL Database Design

### Database Name: `studypilot`

```sql
CREATE DATABASE IF NOT EXISTS studypilot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE studypilot;
```

### Entity Relationship Overview

```
User (1) ──────────────── (N) Guide
User (1) ──────────────── (N) UploadedFile
Guide (1) ─────────────── (N) UploadedFile
Guide (1) ─────────────── (N) Flashcard
Guide (1) ─────────────── (N) QuizQuestion
Guide (1) ─────────────── (N) WeakTopic
Guide (1) ─────────────── (1) StudyPlan
User (1) ──────────────── (N) StudySession
User (1) ──────────────── (N) Message  [RAG chat history]
```

### Table Definitions (Raw SQL for reference)

```sql
-- Users
CREATE TABLE users (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(500) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Guides (a "study guide" session created by a user)
CREATE TABLE guides (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT         NULL,
  subject       VARCHAR(100) NULL,
  source_type   ENUM('pdf', 'notes', 'youtube', 'mixed') NOT NULL DEFAULT 'pdf',
  notes_text    LONGTEXT     NULL,           -- raw notes input
  youtube_url   VARCHAR(500) NULL,           -- YouTube link
  ai_summary    LONGTEXT     NULL,           -- AI-generated summary
  status        ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Uploaded Files (PDFs, images, etc.)
CREATE TABLE uploaded_files (
  id            VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)   NOT NULL,
  guide_id      VARCHAR(36)   NULL,          -- nullable: file may be uploaded before guide creation
  original_name VARCHAR(255)  NOT NULL,
  stored_name   VARCHAR(255)  NOT NULL,      -- UUID-based filename on disk
  mime_type     VARCHAR(100)  NOT NULL,
  size_bytes    BIGINT        NOT NULL,
  storage_path  VARCHAR(500)  NOT NULL,      -- relative path under UPLOAD_DIR
  file_type     ENUM('pdf', 'image', 'other') NOT NULL DEFAULT 'other',
  extracted_text LONGTEXT     NULL,          -- text extracted from PDF (Phase 2)
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- Flashcards
CREATE TABLE flashcards (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  guide_id      VARCHAR(36)  NOT NULL,
  question      TEXT         NOT NULL,
  answer        TEXT         NOT NULL,
  difficulty    ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  times_reviewed INT         NOT NULL DEFAULT 0,
  last_reviewed DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- Quiz Questions
CREATE TABLE quiz_questions (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  guide_id      VARCHAR(36)  NOT NULL,
  question      TEXT         NOT NULL,
  option_a      TEXT         NOT NULL,
  option_b      TEXT         NOT NULL,
  option_c      TEXT         NOT NULL,
  option_d      TEXT         NOT NULL,
  correct_option CHAR(1)     NOT NULL,       -- 'A', 'B', 'C', or 'D'
  explanation   TEXT         NULL,
  topic_tag     VARCHAR(100) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- Weak Topics (AI-identified)
CREATE TABLE weak_topics (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  guide_id      VARCHAR(36)  NOT NULL,
  topic_name    VARCHAR(255) NOT NULL,
  score         FLOAT        NOT NULL DEFAULT 0.0, -- 0.0 to 1.0 mastery
  recommendation TEXT        NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- Study Plans
CREATE TABLE study_plans (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  guide_id      VARCHAR(36)  NOT NULL UNIQUE,  -- one plan per guide
  plan_json     JSON         NOT NULL,          -- flexible AI-generated plan structure
  start_date    DATE         NULL,
  end_date      DATE         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

-- Study Sessions (for dashboard analytics)
CREATE TABLE study_sessions (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)  NOT NULL,
  guide_id      VARCHAR(36)  NULL,
  duration_secs INT          NOT NULL DEFAULT 0,
  activity_type ENUM('reading', 'flashcards', 'quiz', 'notes', 'chat') NOT NULL,
  started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at      DATETIME     NULL,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);

-- RAG Chat Messages (Doubt Solver)
CREATE TABLE messages (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36)  NOT NULL,
  guide_id      VARCHAR(36)  NULL,             -- contextual guide (optional)
  role          ENUM('user', 'assistant') NOT NULL,
  content       LONGTEXT     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL
);
```

---

## 6. Prisma Schema

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────
model User {
  id           String         @id @default(uuid())
  name         String         @db.VarChar(100)
  email        String         @unique @db.VarChar(255)
  passwordHash String         @map("password_hash") @db.VarChar(255)
  avatarUrl    String?        @map("avatar_url") @db.VarChar(500)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  guides         Guide[]
  uploadedFiles  UploadedFile[]
  studySessions  StudySession[]
  messages       Message[]

  @@map("users")
}

// ─────────────────────────────────────────────────────────
// GUIDE
// ─────────────────────────────────────────────────────────
model Guide {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  title       String      @db.VarChar(255)
  description String?     @db.Text
  subject     String?     @db.VarChar(100)
  sourceType  SourceType  @default(pdf) @map("source_type")
  notesText   String?     @map("notes_text") @db.LongText
  youtubeUrl  String?     @map("youtube_url") @db.VarChar(500)
  aiSummary   String?     @map("ai_summary") @db.LongText
  status      GuideStatus @default(processing)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  uploadedFiles UploadedFile[]
  flashcards    Flashcard[]
  quizQuestions QuizQuestion[]
  weakTopics    WeakTopic[]
  studyPlan     StudyPlan?
  studySessions StudySession[]
  messages      Message[]

  @@index([userId])
  @@map("guides")
}

enum SourceType {
  pdf
  notes
  youtube
  mixed
}

enum GuideStatus {
  processing
  ready
  failed
}

// ─────────────────────────────────────────────────────────
// UPLOADED FILE
// ─────────────────────────────────────────────────────────
model UploadedFile {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  guideId       String?   @map("guide_id")
  originalName  String    @map("original_name") @db.VarChar(255)
  storedName    String    @map("stored_name") @db.VarChar(255)
  mimeType      String    @map("mime_type") @db.VarChar(100)
  sizeBytes     BigInt    @map("size_bytes")
  storagePath   String    @map("storage_path") @db.VarChar(500)
  fileType      FileType  @default(other) @map("file_type")
  extractedText String?   @map("extracted_text") @db.LongText
  createdAt     DateTime  @default(now()) @map("created_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([guideId])
  @@map("uploaded_files")
}

enum FileType {
  pdf
  image
  other
}

// ─────────────────────────────────────────────────────────
// FLASHCARD
// ─────────────────────────────────────────────────────────
model Flashcard {
  id           String     @id @default(uuid())
  guideId      String     @map("guide_id")
  question     String     @db.Text
  answer       String     @db.Text
  difficulty   Difficulty @default(medium)
  timesReviewed Int       @default(0) @map("times_reviewed")
  lastReviewed DateTime?  @map("last_reviewed")
  createdAt    DateTime   @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@index([guideId])
  @@map("flashcards")
}

enum Difficulty {
  easy
  medium
  hard
}

// ─────────────────────────────────────────────────────────
// QUIZ QUESTION
// ─────────────────────────────────────────────────────────
model QuizQuestion {
  id            String   @id @default(uuid())
  guideId       String   @map("guide_id")
  question      String   @db.Text
  optionA       String   @map("option_a") @db.Text
  optionB       String   @map("option_b") @db.Text
  optionC       String   @map("option_c") @db.Text
  optionD       String   @map("option_d") @db.Text
  correctOption String   @map("correct_option") @db.Char(1)
  explanation   String?  @db.Text
  topicTag      String?  @map("topic_tag") @db.VarChar(100)
  createdAt     DateTime @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@index([guideId])
  @@map("quiz_questions")
}

// ─────────────────────────────────────────────────────────
// WEAK TOPIC
// ─────────────────────────────────────────────────────────
model WeakTopic {
  id             String   @id @default(uuid())
  guideId        String   @map("guide_id")
  topicName      String   @map("topic_name") @db.VarChar(255)
  score          Float    @default(0.0)
  recommendation String?  @db.Text
  createdAt      DateTime @default(now()) @map("created_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@index([guideId])
  @@map("weak_topics")
}

// ─────────────────────────────────────────────────────────
// STUDY PLAN
// ─────────────────────────────────────────────────────────
model StudyPlan {
  id        String   @id @default(uuid())
  guideId   String   @unique @map("guide_id")
  planJson  Json     @map("plan_json")
  startDate DateTime? @map("start_date") @db.Date
  endDate   DateTime? @map("end_date") @db.Date
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  guide Guide @relation(fields: [guideId], references: [id], onDelete: Cascade)

  @@map("study_plans")
}

// ─────────────────────────────────────────────────────────
// STUDY SESSION
// ─────────────────────────────────────────────────────────
model StudySession {
  id           String       @id @default(uuid())
  userId       String       @map("user_id")
  guideId      String?      @map("guide_id")
  durationSecs Int          @default(0) @map("duration_secs")
  activityType ActivityType @map("activity_type")
  startedAt    DateTime     @default(now()) @map("started_at")
  endedAt      DateTime?    @map("ended_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("study_sessions")
}

enum ActivityType {
  reading
  flashcards
  quiz
  notes
  chat
}

// ─────────────────────────────────────────────────────────
// MESSAGE (RAG Chat History)
// ─────────────────────────────────────────────────────────
model Message {
  id        String      @id @default(uuid())
  userId    String      @map("user_id")
  guideId   String?     @map("guide_id")
  role      MessageRole
  content   String      @db.LongText
  createdAt DateTime    @default(now()) @map("created_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide Guide? @relation(fields: [guideId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([guideId])
  @@map("messages")
}

enum MessageRole {
  user
  assistant
}
```

### Prisma Commands

```bash
# Install Prisma CLI
npm install prisma --save-dev
npm install @prisma/client

# Initialize (if not yet done)
npx prisma init

# Push schema to MySQL (dev — no migration history)
npx prisma db push

# Generate migration (production-safe)
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (browser-based DB viewer)
npx prisma studio
```

---

## 7. User Authentication Flow

```
SIGNUP FLOW
───────────
Client          →  POST /api/auth/signup  { name, email, password }
Backend         →  Validate inputs
Backend         →  Check if email already exists (Prisma)
Backend         →  Hash password with bcrypt (12 rounds)
Backend         →  Create User record in DB
Backend         →  Sign JWT  { userId, email }
Backend         →  Return { token, user }  [200 OK]
Client          →  Store token in localStorage / memory
Client          →  Redirect to /dashboard


LOGIN FLOW
──────────
Client          →  POST /api/auth/login  { email, password }
Backend         →  Find user by email
Backend         →  Compare password with bcrypt
Backend         →  Sign new JWT
Backend         →  Return { token, user }  [200 OK]
Client          →  Store token
Client          →  Redirect to /dashboard


PROTECTED REQUEST FLOW
──────────────────────
Client          →  GET /api/guides  (with Authorization: Bearer <token>)
authGuard MW    →  Extract token from header
authGuard MW    →  Verify JWT signature + expiry
authGuard MW    →  Attach decoded user to req.user
Controller      →  Handle request using req.user.id
Backend         →  Return data  [200 OK]


TOKEN EXPIRY
────────────
- Token TTL: 7 days (configurable via JWT_EXPIRES_IN)
- No refresh token in Phase 1 (add in Phase 2 if needed)
- Client re-prompts login when 401 is received
```

---

## 8. Signup API

### Endpoint

```
POST /api/auth/signup
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Ali Hassan",
  "email": "ali@example.com",
  "password": "SecurePass123!"
}
```

### Validation Rules

| Field    | Rule                                               |
|----------|----------------------------------------------------|
| name     | Required, string, 2–100 chars                      |
| email    | Required, valid email format, unique in DB         |
| password | Required, min 8 chars, at least 1 uppercase + digit|

### Controller: `src/controllers/auth.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { hashPassword } from '../utils/hash';
import { signToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json(
        ApiResponse.error('Email is already registered', 409)
      );
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // 4. Sign JWT
    const token = signToken({ userId: user.id, email: user.email });

    return res.status(201).json(
      ApiResponse.success({ token, user }, 'Account created successfully', 201)
    );
  } catch (err) {
    next(err);
  }
};
```

### Success Response `201`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Account created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "name": "Ali Hassan",
      "email": "ali@example.com",
      "createdAt": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

### Error Responses

| Status | Scenario              |
|--------|-----------------------|
| 400    | Missing/invalid fields|
| 409    | Email already taken   |
| 500    | Database error        |

---

## 9. Login API

### Endpoint

```
POST /api/auth/login
Content-Type: application/json
```

### Request Body

```json
{
  "email": "ali@example.com",
  "password": "SecurePass123!"
}
```

### Controller

```typescript
import { comparePassword } from '../utils/hash';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json(
        ApiResponse.error('Invalid email or password', 401)
      );
    }

    // 2. Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json(
        ApiResponse.error('Invalid email or password', 401)
      );
    }

    // 3. Sign token
    const token = signToken({ userId: user.id, email: user.email });

    return res.status(200).json(
      ApiResponse.success({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      }, 'Login successful')
    );
  } catch (err) {
    next(err);
  }
};
```

### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "name": "Ali Hassan",
      "email": "ali@example.com",
      "avatarUrl": null,
      "createdAt": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

### Error Responses

| Status | Scenario                     |
|--------|------------------------------|
| 400    | Missing fields               |
| 401    | Wrong email or password      |
| 500    | Internal error               |

> **Security Note:** Always return the same message for both "user not found" and "wrong password" to prevent user enumeration attacks.

---

## 10. JWT Middleware

### `src/utils/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
};
```

### `src/middleware/authGuard.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        ApiResponse.error('Authorization token is required', 401)
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        ApiResponse.error('Token has expired. Please log in again.', 401)
      );
    }
    return res.status(401).json(
      ApiResponse.error('Invalid token', 401)
    );
  }
};
```

### `src/types/express.d.ts`

```typescript
import { JwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

---

## 11. Protected Routes

### `src/routes/auth.routes.ts`

```typescript
import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authGuard, getMe);       // Protected — returns current user

export default router;
```

### `src/routes/guide.routes.ts`

```typescript
import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import {
  createGuide,
  getGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
} from '../controllers/guide.controller';

const router = Router();

// All guide routes are protected
router.use(authGuard);

router.get('/', getGuides);             // GET /api/guides
router.post('/', createGuide);          // POST /api/guides
router.get('/:id', getGuideById);       // GET /api/guides/:id
router.put('/:id', updateGuide);        // PUT /api/guides/:id
router.delete('/:id', deleteGuide);     // DELETE /api/guides/:id

export default router;
```

### `src/app.ts` — Route Registration

```typescript
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes  from './routes/auth.routes';
import guideRoutes from './routes/guide.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// ── Middleware ────────────────────────────────────
app.use(cors({ origin: ENV.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for uploads ──────────────
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// ── Routes ───────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/guides',  guideRoutes);
app.use('/api/upload',  uploadRoutes);

// ── Health Check ─────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ─────────────────────────
app.use(errorHandler);

export default app;
```

---

## 12. User Profile API

### Endpoints

```
GET    /api/auth/me          — Get current user profile
PUT    /api/users/profile    — Update name or avatarUrl
```

### `getMe` Controller

```typescript
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { guides: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json(ApiResponse.error('User not found', 404));
    }

    return res.json(ApiResponse.success(user));
  } catch (err) {
    next(err);
  }
};
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {
    "id": "uuid",
    "name": "Ali Hassan",
    "email": "ali@example.com",
    "avatarUrl": null,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "_count": {
      "guides": 5
    }
  }
}
```

---

## 13. Guide Table Schema

> See Prisma schema Section 6 for the full `Guide` model.

### Guide Status Lifecycle

```
[User creates guide]  →  status: "processing"
[AI processing done]  →  status: "ready"
[AI fails]            →  status: "failed"
```

### Guide Controller (Core CRUD)

```typescript
// GET /api/guides — list current user's guides
export const getGuides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guides = await prisma.guide.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true, subject: true,
        sourceType: true, status: true, createdAt: true,
        _count: { select: { flashcards: true, quizQuestions: true } },
      },
    });
    return res.json(ApiResponse.success(guides));
  } catch (err) { next(err); }
};

// POST /api/guides — create new guide
export const createGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, subject, sourceType, notesText, youtubeUrl } = req.body;

    const guide = await prisma.guide.create({
      data: {
        userId: req.user!.userId,
        title,
        description,
        subject,
        sourceType: sourceType || 'pdf',
        notesText,
        youtubeUrl,
        status: 'processing',
      },
    });

    return res.status(201).json(ApiResponse.success(guide, 'Guide created', 201));
  } catch (err) { next(err); }
};

// DELETE /api/guides/:id
export const deleteGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guide = await prisma.guide.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    await prisma.guide.delete({ where: { id: req.params.id } });

    return res.json(ApiResponse.success(null, 'Guide deleted'));
  } catch (err) { next(err); }
};
```

---

## 14. Uploaded Files Table Schema

> See Prisma schema Section 6 for the full `UploadedFile` model.

### `src/services/upload.service.ts` — Multer Configuration

```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env';
import fs from 'fs';

// Ensure upload directories exist
const dirs = ['pdfs', 'images', 'temp'].map(d =>
  path.join(ENV.UPLOAD_DIR, d)
);
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    const subDir = isPdf ? 'pdfs' : isImage ? 'images' : 'temp';
    cb(null, path.join(ENV.UPLOAD_DIR, subDir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
```

### Upload Controller

```typescript
// POST /api/upload — upload a file
export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No file provided', 400));
    }

    const { guideId } = req.body;
    const file = req.file;

    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');

    const saved = await prisma.uploadedFile.create({
      data: {
        userId: req.user!.userId,
        guideId: guideId || null,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        fileType: isPdf ? 'pdf' : isImage ? 'image' : 'other',
      },
    });

    return res.status(201).json(ApiResponse.success(saved, 'File uploaded', 201));
  } catch (err) {
    next(err);
  }
};
```

### Upload Route

```typescript
// POST /api/upload
router.post('/', authGuard, upload.single('file'), uploadFile);
```

---

## 15. API Response Format

All API responses follow a consistent envelope format.

### `src/utils/response.ts`

```typescript
export class ApiResponse {
  static success<T>(
    data: T,
    message = 'OK',
    statusCode = 200
  ) {
    return {
      success: true,
      statusCode,
      message,
      data,
    };
  }

  static error(
    message: string,
    statusCode = 500,
    errors?: Record<string, string>
  ) {
    return {
      success: false,
      statusCode,
      message,
      ...(errors && { errors }),
      data: null,
    };
  }
}
```

### Success Shape

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": { ... }
}
```

### Error Shape

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  },
  "data": null
}
```

---

## 16. Error Handling Format

### `src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';
import { ApiResponse } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[ERROR]', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json(
      ApiResponse.error('A record with this value already exists', 409)
    );
  }

  if (err.code === 'P2025') {
    return res.status(404).json(
      ApiResponse.error('Record not found', 404)
    );
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      ApiResponse.error(`File too large. Max size is ${ENV.MAX_FILE_SIZE_MB}MB`, 413)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(ApiResponse.error('Invalid token', 401));
  }

  // Generic
  const statusCode = err.statusCode || 500;
  const message = ENV.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message || 'Internal server error';

  return res.status(statusCode).json(ApiResponse.error(message, statusCode));
};
```

### HTTP Status Code Reference

| Code | Usage                                 |
|------|---------------------------------------|
| 200  | Success — GET, PUT, DELETE            |
| 201  | Created — POST creating a resource    |
| 400  | Bad Request — Validation failed       |
| 401  | Unauthorized — Missing/invalid token  |
| 403  | Forbidden — Authenticated but no access|
| 404  | Not Found — Resource doesn't exist    |
| 409  | Conflict — Duplicate email, etc.      |
| 413  | Payload Too Large — File size limit   |
| 500  | Internal Server Error                 |

---

## 17. Frontend Integration Guide

> The frontend is already built. Use this section to correctly wire the existing `.tsx` pages to the backend.

### Base URL Configuration

In your React project, create or update:

```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

```env
# Frontend .env
VITE_API_URL=http://localhost:5000/api
```

### Axios Instance with JWT Interceptor

```typescript
// src/lib/axios.ts
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studypilot_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('studypilot_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Auth Service (Frontend)

```typescript
// src/services/auth.service.ts
import { api } from '../lib/axios';

export const authService = {
  async signup(name: string, email: string, password: string) {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('studypilot_token', data.data.token);
    return data.data;
  },

  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('studypilot_token', data.data.token);
    return data.data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data.data;
  },

  logout() {
    localStorage.removeItem('studypilot_token');
    window.location.href = '/login';
  },
};
```

### Guide Service (Frontend)

```typescript
// src/services/guide.service.ts
import { api } from '../lib/axios';

export const guideService = {
  async getAll() {
    const { data } = await api.get('/guides');
    return data.data;
  },

  async create(payload: {
    title: string;
    description?: string;
    subject?: string;
    sourceType?: string;
    notesText?: string;
    youtubeUrl?: string;
  }) {
    const { data } = await api.post('/guides', payload);
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get(`/guides/${id}`);
    return data.data;
  },

  async delete(id: string) {
    const { data } = await api.delete(`/guides/${id}`);
    return data.data;
  },
};
```

### File Upload Service (Frontend)

```typescript
// src/services/upload.service.ts
import { api } from '../lib/axios';

export const uploadService = {
  async uploadFile(file: File, guideId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (guideId) formData.append('guideId', guideId);

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
```

### Page → API Mapping

| Frontend Page    | API Calls Needed                                  |
|------------------|---------------------------------------------------|
| `/login`         | `POST /api/auth/login`                            |
| `/signup`        | `POST /api/auth/signup`                           |
| `/dashboard`     | `GET /api/auth/me`, `GET /api/guides`             |
| `/my-guides`     | `GET /api/guides`                                 |
| `/new-guide`     | `POST /api/guides`, `POST /api/upload`            |
| `/guides/:id`    | `GET /api/guides/:id`                             |
| `/resources`     | `GET /api/upload` (future), `GET /api/guides`     |
| `/history`       | `GET /api/study-sessions` (future)                |
| `/profile`       | `GET /api/auth/me`, `PUT /api/users/profile`      |

---

## 18. Testing Checklist

Test each item manually using **Postman**, **Thunder Client**, or `curl`.

### Environment Setup

```
Base URL: http://localhost:5000
Variable: {{token}} — paste JWT after login
```

### Auth Tests

- [ ] `POST /api/auth/signup` — valid data → `201` with token + user
- [ ] `POST /api/auth/signup` — duplicate email → `409`
- [ ] `POST /api/auth/signup` — missing name → `400`
- [ ] `POST /api/auth/login` — correct credentials → `200` with token
- [ ] `POST /api/auth/login` — wrong password → `401`
- [ ] `POST /api/auth/login` — unknown email → `401`
- [ ] `GET /api/auth/me` — valid token → `200` with user data
- [ ] `GET /api/auth/me` — no token → `401`
- [ ] `GET /api/auth/me` — expired/bad token → `401`

### Guide Tests

- [ ] `POST /api/guides` — with valid token → `201` guide created
- [ ] `GET /api/guides` — returns only current user's guides
- [ ] `GET /api/guides/:id` — correct user → `200`
- [ ] `GET /api/guides/:id` — wrong user's guide → `404`
- [ ] `DELETE /api/guides/:id` — deletes guide + cascades FK
- [ ] `GET /api/guides` — no token → `401`

### File Upload Tests

- [ ] `POST /api/upload` — valid PDF under 25MB → `201`
- [ ] `POST /api/upload` — file > 25MB → `413`
- [ ] `POST /api/upload` — disallowed MIME type → `400`
- [ ] `POST /api/upload` — with `guideId` → file linked to guide
- [ ] File appears in `./uploads/pdfs/` on disk

### Database Tests (MySQL Workbench)

- [ ] `users` table has hashed passwords (never plaintext)
- [ ] `guides` table rows have correct `user_id` FK
- [ ] `uploaded_files` rows reference correct `user_id`
- [ ] Deleting a user cascades and removes their guides + files
- [ ] Deleting a guide cascades and removes flashcards, quizzes, etc.

### Health Check

- [ ] `GET /api/health` → `{ "status": "ok" }`

---

## 19. Completion Criteria

Phase 1 is complete when **all** of the following are true:

### Infrastructure

- [x] Node.js + Express server runs without errors on `PORT=5000`
- [x] MySQL database `studypilot` is created and accessible via MySQL Workbench
- [x] Prisma schema is applied (`npx prisma db push` or `migrate dev`)
- [x] All 9 tables exist: `users`, `guides`, `uploaded_files`, `flashcards`, `quiz_questions`, `weak_topics`, `study_plans`, `study_sessions`, `messages`
- [x] `.env` is configured and validated at startup

### Authentication

- [x] Signup endpoint creates user with bcrypt-hashed password
- [x] Login endpoint verifies password and returns JWT
- [x] JWT middleware correctly blocks unauthorized requests
- [x] `GET /api/auth/me` returns authenticated user's profile

### Guides

- [x] CRUD endpoints for guides are functional and user-scoped
- [x] Guides are isolated per user (no cross-user access)

### File Uploads

- [x] Multer accepts PDF and images up to 25MB
- [x] Uploaded files are stored on disk with UUID filenames
- [x] `UploadedFile` records are saved to MySQL with correct metadata

### API Quality

- [x] All endpoints return standardized `ApiResponse` envelope
- [x] Global error handler catches and formats all unhandled errors
- [x] Prisma unique constraint violations return `409`
- [x] CORS is configured for `http://localhost:5173`

### Frontend Ready

- [x] Frontend can signup, login, and receive a token
- [x] Axios interceptor attaches token automatically
- [x] `401` responses redirect to `/login`
- [x] Dashboard can fetch guides list for logged-in user

---

## Appendix A: Quick Start Commands

```bash
# Clone / navigate to backend folder
cd studypilot-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Push schema to database
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Start production
npm run build
npm start
```

## Appendix B: `package.json` Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.10.0",
    "@types/uuid": "^9.0.7",
    "prisma": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Appendix C: Future Phase API Endpoints (Stubs)

These routes will be implemented in subsequent phases. Define stub routers now.

```
Phase 2 — Content Processing
  POST   /api/guides/:id/process-pdf       # Extract text from uploaded PDF
  POST   /api/guides/:id/process-notes     # Accept raw notes text
  POST   /api/guides/:id/process-youtube   # Fetch YT transcript

Phase 3 — AI Generation
  POST   /api/guides/:id/generate-summary     # AI summary
  POST   /api/guides/:id/generate-flashcards  # AI flashcard generation
  POST   /api/guides/:id/generate-quiz        # AI quiz generation

Phase 4 — Learning Features
  GET    /api/guides/:id/flashcards           # Get flashcards
  PATCH  /api/flashcards/:id/review           # Mark reviewed
  GET    /api/guides/:id/quiz                 # Get quiz
  POST   /api/guides/:id/quiz/submit          # Submit answers, get score
  GET    /api/guides/:id/weak-topics          # Get weak topic analysis

Phase 5 — Study Planner
  POST   /api/guides/:id/study-plan           # Generate study plan
  GET    /api/guides/:id/study-plan           # Get plan
  PATCH  /api/study-plans/:id                 # Update plan

Phase 6 — RAG Doubt Solver
  POST   /api/chat                            # Send message, get AI answer
  GET    /api/chat?guideId=...               # Get chat history

Phase 7 — Dashboard Analytics
  GET    /api/dashboard/stats                 # User stats summary
  POST   /api/study-sessions                 # Log study session
  GET    /api/study-sessions                 # Session history

Phase 8 — Export
  GET    /api/guides/:id/export/pdf           # Export guide as PDF
```

---

*End of Backend Phase 1 Documentation — StudyPilot AI*  
*Version 1.0 | Ready for Claude Code / Developer Implementation*
