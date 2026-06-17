# StudyPilot AI 🚀

StudyPilot AI is a premium, AI-powered study companion that transforms raw learning materials (PDFs, text notes, and YouTube lectures) into a complete, structured study workspace featuring interactive tools, RAG doubt solving, and diagnostic analytics.

---

## Key Features 🌟

- **AI Guide Generation**: Process notes, PDFs, or YouTube links to instantly create summaries, active concepts, flashcards, MCQs, and revision sheets.
- **Spaced-Repetition Review**: Practice flashcards backed by the **SuperMemo-2 (SM-2)** algorithm to schedule next reviews based on recall difficulty.
- **Smart Quizzes**: Take generated practice quizzes with automated semantic grading and diagnostic topic performance breakdowns.
- **Study Planner**: Add sessions to your study calendar or ask the AI to suggest a customized 7-day schedule focused on your weak topics.
- **AI Doubt Solver (RAG)**: Ask open-ended questions about your study guides, powered by a lightweight local ONNX vector search engine (`@xenova/transformers`) and Groq.
- **Diagnostic Analytics**:
  - Streak tracking and study time charts.
  - Performance heatmaps and rolling weak topic lists.
  - Linear-regression predictor projecting your exam score based on study patterns.
- **PDF Report Generation**: Download structured academic reports for guides, quiz results, and overall analytics.

---

## Project Structure 📁

- `studypilot-app/` - React + TypeScript + Tailwind CSS Frontend.
- `studypilot-backend/` - Node.js + Express + Prisma (MySQL) Backend.

---

## How to Get Started 🛠️

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MySQL](https://www.mysql.com/) database running locally or remotely

---

### 1. Backend Setup ⚙️

1. Navigate to the backend folder:
   ```bash
   cd studypilot-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `studypilot-backend` root directory (you can copy from `.env.example`) and configure the database URL and API keys:
   ```env
   PORT=5000
   DATABASE_URL="mysql://username:password@localhost:3306/studypilot"
   JWT_SECRET="your_jwt_secret_key"
   GROQ_API_KEY="your_groq_api_key"
   ```

4. Push the database schema:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will be running on `http://localhost:5000`.

---

### 2. Frontend Setup 💻

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd studypilot-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at the local address displayed (usually `http://localhost:5173`).

---

## Simpler Usage Flow 💡

1. **Sign Up / Login**: Create a student account.
2. **Create a Study Guide**: Upload a PDF lecture, paste notes, or paste a YouTube URL.
3. **Study & Review**:
   - Read the AI-generated summaries and concepts.
   - Practice flashcards (the app remembers your SM-2 recall scores).
   - Take quizzes (your scores feed topic statistics).
4. **Solve Doubts**: Chat with the RAG tutor directly in the workspace to clarify difficult sections.
5. **Track Progress**: Go to the Analytics dashboard to check your consistency streaks, weak topics, and projected exam score.
6. **Export**: Export a beautiful academic summary report to PDF for offline studying.
