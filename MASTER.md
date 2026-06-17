# Stitch.md — StudyPilot AI Master Architecture

> **Project:** StudyPilot AI
> **Purpose:** Master integration document for all phases
> **Status:** Implementation-Ready
> **Tech Stack:** Streamlit + Groq + FAISS + Plotly + ReportLab
> **Last Updated:** June 2025

---

## 1. Project Vision

StudyPilot AI is an AI-powered study companion that converts notes, PDFs, and YouTube lectures into a complete learning system.

The system helps students:

* Understand content
* Revise using flashcards
* Test themselves using quizzes
* Identify weak topics
* Generate personalized study plans
* Ask doubts from uploaded notes
* Predict exam readiness
* Export a complete PDF report

---

## 2. Core Rule

Every phase must follow one shared data contract.

Do not let each phase create its own random JSON format.

All phases must read from and write to the global `app_state`.

---

## 3. Final User Flow

```text
1. User uploads PDF / enters notes / adds YouTube URL
        ↓
2. Raw Study Content is generated
        ↓
3. AI Processing creates summaries, topics, concepts, metadata
        ↓
4. Learning tools generate flashcards, mind map, revision sheet
        ↓
5. Quiz system generates MCQs
        ↓
6. User attempts quiz
        ↓
7. Performance analysis detects score, weak topics, readiness
        ↓
8. Study planner creates day-wise schedule
        ↓
9. AI doubt solver answers questions from uploaded content
        ↓
10. Study predictor estimates exam score
        ↓
11. Dashboard visualizes progress
        ↓
12. PDF export generates final report
```

---

## 4. Phase Map

| Phase    | Name                 | Main Output                               |
| -------- | -------------------- | ----------------------------------------- |
| Phase 1  | Input Module         | `raw_content`                             |
| Phase 2  | AI Processing Engine | `learning_package`                        |
| Phase 3  | Learning Tools       | `flashcards`, `revision_sheet`, `mindmap` |
| Phase 4  | Quiz Generator       | `quiz`                                    |
| Phase 5  | Performance Analysis | `performance_report`                      |
| Phase 6  | Study Planner        | `study_plan`                              |
| Phase 7  | AI Doubt Solver      | `rag_answer`, `chat_history`              |
| Phase 8  | Study Predictor      | `prediction_report`                       |
| Phase 9  | Analytics Dashboard  | `dashboard_metrics`                       |
| Phase 10 | PDF Export System    | `pdf_report`                              |

---

## 5. Recommended Folder Structure

```text
StudyPilotAI/
│
├── app.py
├── requirements.txt
├── .env.example
├── README.md
├── Stitch.md
│
├── modules/
│   ├── pdf_reader.py
│   ├── notes_reader.py
│   ├── youtube_reader.py
│   ├── content_normalizer.py
│   │
│   ├── groq_client.py
│   ├── text_preprocessor.py
│   ├── summarizer.py
│   ├── concept_extractor.py
│   ├── topic_extractor.py
│   ├── hierarchy_builder.py
│   ├── metadata_generator.py
│   │
│   ├── flashcards.py
│   ├── revision_sheet.py
│   ├── mindmap.py
│   ├── topic_ranker.py
│   │
│   ├── quiz_generator.py
│   ├── quiz_validator.py
│   ├── quiz_session.py
│   │
│   ├── evaluator.py
│   ├── topic_performance.py
│   ├── weak_topics.py
│   ├── readiness.py
│   ├── feedback_generator.py
│   │
│   ├── study_planner.py
│   ├── time_estimator.py
│   ├── priority_engine.py
│   ├── schedule_generator.py
│   │
│   ├── chunk_manager.py
│   ├── embedding_generator.py
│   ├── vector_store.py
│   ├── retriever.py
│   ├── rag.py
│   │
│   ├── predictor.py
│   ├── grade_probability.py
│   ├── risk_analyzer.py
│   ├── prediction_recommendations.py
│   │
│   ├── dashboard.py
│   ├── chart_generator.py
│   └── pdf_export.py
│
├── prompts/
│   ├── phase2_prompts.py
│   ├── phase3_prompts.py
│   ├── phase4_prompts.py
│   └── phase7_prompts.py
│
├── schemas/
│   ├── app_state_schema.py
│   ├── learning_schema.py
│   ├── quiz_schema.py
│   ├── performance_schema.py
│   ├── planner_schema.py
│   └── predictor_schema.py
│
├── data/
│   ├── uploads/
│   ├── exports/
│   └── cache/
│
├── vector_db/
│   └── embeddings.index
│
├── pages/
│   ├── 1_Upload_Content.py
│   ├── 2_Summary.py
│   ├── 3_Flashcards.py
│   ├── 4_Quiz.py
│   ├── 5_Study_Plan.py
│   ├── 6_Doubt_Solver.py
│   ├── 7_Dashboard.py
│   └── 8_Export.py
│
└── tests/
    ├── test_phase1.py
    ├── test_phase2.py
    ├── test_phase3.py
    ├── test_phase4.py
    ├── test_phase5.py
    ├── test_phase6.py
    ├── test_phase7.py
    ├── test_phase8.py
    ├── test_phase9.py
    └── test_phase10.py
```

---

## 6. Global App State

All phases must use this shared structure.

```python
app_state = {
    "project": {
        "name": "StudyPilot AI",
        "subject": None,
        "created_at": None
    },

    "input": {
        "source_type": None,
        "file_name": None,
        "youtube_url": None,
        "raw_content": "",
        "clean_content": "",
        "word_count": 0
    },

    "learning_package": {
        "short_summary": "",
        "detailed_summary": "",
        "concepts": [],
        "topics": [],
        "topic_hierarchy": {},
        "metadata": {}
    },

    "learning_tools": {
        "flashcards": [],
        "revision_sheet": {},
        "mindmap": {},
        "topic_rankings": []
    },

    "quiz": {
        "quiz_id": None,
        "questions": [],
        "user_answers": {},
        "submitted": False
    },

    "performance_report": {
        "score": 0,
        "total_questions": 0,
        "accuracy": 0.0,
        "topic_performance": {},
        "weak_topics": [],
        "strong_topics": [],
        "exam_readiness": 0.0,
        "feedback": ""
    },

    "study_plan": {
        "exam_date": None,
        "days_remaining": 0,
        "hours_per_day": 0,
        "topic_time_estimates": {},
        "priority_topics": [],
        "daily_schedule": [],
        "summary": {}
    },

    "rag": {
        "chunks": [],
        "chat_history": [],
        "last_answer": "",
        "last_sources": [],
        "confidence": 0.0
    },

    "prediction_report": {
        "predicted_score": {},
        "expected_score": 0,
        "grade_probability": {},
        "risk_level": "",
        "trend": "",
        "recommendations": []
    },

    "dashboard": {
        "metrics": {},
        "charts_ready": False
    },

    "export": {
        "pdf_path": None,
        "generated_at": None,
        "status": "not_generated"
    }
}
```

---

## 7. Streamlit Session State Keys

Use these exact keys.

```python
SESSION_KEYS = [
    "app_state",
    "raw_content",
    "clean_content",
    "learning_package",
    "flashcards",
    "revision_sheet",
    "quiz",
    "performance_report",
    "study_plan",
    "rag_chat_history",
    "prediction_report",
    "dashboard_metrics",
    "pdf_report"
]
```

Initialize them in `app.py`.

```python
import streamlit as st

def init_session_state():
    if "app_state" not in st.session_state:
        st.session_state["app_state"] = app_state.copy()
```

---

## 8. Phase Dependencies

```text
Phase 1
  └── produces: input.raw_content, input.clean_content

Phase 2
  └── requires: input.clean_content
  └── produces: learning_package

Phase 3
  └── requires: learning_package
  └── produces: flashcards, revision_sheet, mindmap

Phase 4
  └── requires: learning_package, flashcards
  └── produces: quiz

Phase 5
  └── requires: quiz
  └── produces: performance_report

Phase 6
  └── requires: performance_report, learning_package
  └── produces: study_plan

Phase 7
  └── requires: input.clean_content, learning_package
  └── produces: rag.chat_history, rag.last_answer

Phase 8
  └── requires: performance_report, study_plan
  └── produces: prediction_report

Phase 9
  └── requires: learning_package, performance_report, study_plan, prediction_report
  └── produces: dashboard.metrics

Phase 10
  └── requires: all available reports
  └── produces: export.pdf_path
```

---

## 9. Global Data Models

### Topic Object

```json
{
  "name": "Transactions",
  "importance": 0.88,
  "complexity": "Medium",
  "source": "Phase 2"
}
```

---

### Flashcard Object

```json
{
  "id": 1,
  "question": "What is a transaction?",
  "answer": "A transaction is a sequence of database operations treated as one logical unit.",
  "topic": "Transactions"
}
```

---

### Quiz Question Object

```json
{
  "id": 1,
  "question": "Which property ensures a transaction is fully completed or not executed at all?",
  "options": ["Atomicity", "Consistency", "Isolation", "Durability"],
  "correct_answer": "Atomicity",
  "selected_answer": null,
  "topic": "Transactions",
  "difficulty": "Medium"
}
```

---

### Topic Performance Object

```json
{
  "Transactions": {
    "correct": 1,
    "wrong": 3,
    "total": 4,
    "accuracy": 25.0
  }
}
```

---

### Daily Study Plan Object

```json
{
  "day": 1,
  "date": "2025-06-15",
  "tasks": [
    {
      "topic": "Transactions",
      "duration_minutes": 60,
      "task_type": "Revision"
    }
  ]
}
```

---

### Prediction Object

```json
{
  "predicted_score": {
    "min": 80,
    "max": 88
  },
  "expected_score": 84,
  "grade_probability": {
    "A": 72,
    "B": 20,
    "C": 6,
    "D": 2
  },
  "risk_level": "Medium"
}
```

---

## 10. Tech Stack

| Area                   | Tool                     |
| ---------------------- | ------------------------ |
| Frontend               | Streamlit                |
| AI Model API           | Groq                     |
| Recommended Groq Model | `llama-3.1-8b-instant`   |
| PDF Extraction         | `pypdf`                  |
| YouTube Transcript     | `youtube-transcript-api` |
| Embeddings             | `sentence-transformers`  |
| Vector Search          | `faiss-cpu`              |
| Charts                 | Plotly                   |
| PDF Export             | ReportLab                |
| Validation             | Pydantic                 |
| Data Handling          | Pandas, JSON             |
| Environment Variables  | python-dotenv            |

---

## 11. Environment Variables

Create `.env`.

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

Create `.env.example`.

```env
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

Never hardcode API keys.

---

## 12. requirements.txt

```txt
streamlit
groq
python-dotenv
pypdf
youtube-transcript-api
pydantic
pandas
numpy
plotly
matplotlib
sentence-transformers
faiss-cpu
reportlab
```

---

## 13. App Navigation

Use Streamlit multipage app.

```text
Home
Upload Content
Summary
Flashcards
Quiz
Study Planner
Doubt Solver
Dashboard
Export PDF
```

Recommended sidebar:

```python
st.sidebar.title("StudyPilot AI")
st.sidebar.page_link("pages/1_Upload_Content.py", label="Upload Content")
st.sidebar.page_link("pages/2_Summary.py", label="Summary")
st.sidebar.page_link("pages/3_Flashcards.py", label="Flashcards")
st.sidebar.page_link("pages/4_Quiz.py", label="Quiz")
st.sidebar.page_link("pages/5_Study_Plan.py", label="Study Planner")
st.sidebar.page_link("pages/6_Doubt_Solver.py", label="Doubt Solver")
st.sidebar.page_link("pages/7_Dashboard.py", label="Dashboard")
st.sidebar.page_link("pages/8_Export.py", label="Export PDF")
```

---

## 14. Main Integration Rule

Every phase should expose one main pipeline function.

```python
run_phase1()
run_phase2()
run_phase3()
run_phase4()
run_phase5()
run_phase6()
run_phase7()
run_phase8()
run_phase9()
run_phase10()
```

Each function should:

1. Read required data from `st.session_state["app_state"]`
2. Process its phase
3. Write output back to `st.session_state["app_state"]`
4. Return updated app state

---

## 15. Pipeline Function Contracts

### Phase 1

```python
def run_phase1(source_type: str, input_data) -> dict:
    """
    Returns:
    {
        "source_type": "pdf",
        "raw_content": "...",
        "clean_content": "...",
        "word_count": 1200
    }
    """
```

---

### Phase 2

```python
def run_phase2(clean_content: str) -> dict:
    """
    Returns learning_package.
    """
```

---

### Phase 3

```python
def run_phase3(learning_package: dict) -> dict:
    """
    Returns flashcards, revision_sheet, mindmap, topic_rankings.
    """
```

---

### Phase 4

```python
def run_phase4(learning_package: dict, num_questions: int) -> dict:
    """
    Returns quiz object.
    """
```

---

### Phase 5

```python
def run_phase5(quiz: dict) -> dict:
    """
    Returns performance_report.
    """
```

---

### Phase 6

```python
def run_phase6(performance_report: dict, learning_package: dict, exam_date, hours_per_day: float) -> dict:
    """
    Returns study_plan.
    """
```

---

### Phase 7

```python
def run_phase7(question: str, clean_content: str) -> dict:
    """
    Returns answer, sources, confidence.
    """
```

---

### Phase 8

```python
def run_phase8(performance_report: dict, study_plan: dict) -> dict:
    """
    Returns prediction_report.
    """
```

---

### Phase 9

```python
def run_phase9(app_state: dict) -> dict:
    """
    Returns dashboard metrics.
    """
```

---

### Phase 10

```python
def run_phase10(app_state: dict) -> bytes:
    """
    Returns PDF file bytes.
    """
```

---

## 16. Module Rules

### Rule 1: No UI inside logic modules

Bad:

```python
def extract_pdf():
    st.file_uploader("Upload PDF")
```

Good:

```python
def extract_pdf_text(file) -> str:
    return text
```

UI stays in `pages/`.

Logic stays in `modules/`.

---

### Rule 2: No API key inside code

Bad:

```python
client = Groq(api_key="abc123")
```

Good:

```python
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
```

---

### Rule 3: Every AI response must be validated

Use JSON parsing and fallback handling.

---

### Rule 4: Every downstream phase must receive predictable data

Example:

```python
quiz["questions"]
performance_report["weak_topics"]
study_plan["daily_schedule"]
```

Do not change key names randomly.

---

## 17. Minimum Viable Hackathon Build

If time is short, build in this order:

```text
Must Have:
1. Phase 1 — Upload/Input
2. Phase 2 — Summary + Topics
3. Phase 3 — Flashcards
4. Phase 4 — Quiz
5. Phase 5 — Score + Weak Topics
6. Phase 6 — Study Plan
7. Phase 10 — PDF Export

Nice to Have:
8. Phase 7 — Doubt Solver
9. Phase 8 — Predictor
10. Phase 9 — Dashboard
```

---

## 18. Recommended Development Order

```text
Step 1: Create Stitch.md
Step 2: Create folder structure
Step 3: Create app.py and session state
Step 4: Implement Phase 1
Step 5: Test Phase 1 fully
Step 6: Implement Phase 2
Step 7: Test Phase 2 output JSON
Step 8: Implement Phase 3
Step 9: Implement Phase 4
Step 10: Implement Phase 5
Step 11: Implement Phase 6
Step 12: Add Phase 10 export
Step 13: Add Phase 7 RAG
Step 14: Add Phase 8 predictor
Step 15: Add Phase 9 dashboard
Step 16: Final demo testing
```

---

## 19. Error Handling Standard

Every phase should return:

```python
{
    "success": True,
    "data": {},
    "error": None
}
```

or

```python
{
    "success": False,
    "data": None,
    "error": "Readable error message"
}
```

---

## 20. UI Error Messages

Use simple messages.

```python
st.error("Please upload content first.")
st.warning("Quiz must be completed before generating performance analysis.")
st.success("Study plan generated successfully.")
```

---

## 21. Caching Strategy

Use caching only for expensive functions.

```python
@st.cache_data
def cached_summary(content_hash):
    pass
```

Cache:

* Phase 2 AI outputs
* Phase 4 quiz generation
* Phase 7 embeddings
* Phase 10 PDF export

Do not cache:

* User answers
* Chat history
* Current form inputs

---

## 22. Demo Flow

Use this exact demo sequence:

```text
1. Open StudyPilot AI
2. Upload Database Systems notes PDF
3. Generate summary
4. Show extracted topics
5. Generate flashcards
6. Open quiz
7. Attempt 5–10 questions
8. Show score and weak topics
9. Generate study plan
10. Show predicted score
11. Open dashboard
12. Export PDF report
```

---

## 23. Demo Dataset Recommendation

Use Database Systems notes because they produce clear features:

```text
Joins
Transactions
Views
Triggers
Stored Procedures
Normalization
Keys
SQL Queries
```

These topics work well for:

* Summaries
* Flashcards
* MCQs
* Weak topic detection
* Study planner
* Dashboard

---

## 24. Final Integration Checklist

* [ ] App opens without error
* [ ] Sidebar navigation works
* [ ] Phase 1 generates `clean_content`
* [ ] Phase 2 generates summaries and topics
* [ ] Phase 3 generates flashcards
* [ ] Phase 4 generates MCQs
* [ ] Phase 5 calculates score
* [ ] Weak topics detected
* [ ] Phase 6 generates study plan
* [ ] Phase 7 answers doubts from notes
* [ ] Phase 8 predicts score
* [ ] Phase 9 dashboard loads
* [ ] Phase 10 exports PDF
* [ ] No missing session keys
* [ ] No hardcoded API keys
* [ ] App runs from fresh clone
* [ ] Demo completes in under 2 minutes

---

## 25. Final Command

Run app:

```bash
streamlit run app.py
```

---

## 26. Golden Rule

If a module breaks, check the data contract first.

Most bugs will come from:

```text
wrong key names
missing session state
invalid JSON
AI response not matching expected schema
phase output not saved
```

Fix those before changing the full architecture.

---

*End of Stitch.md*
*StudyPilot AI — Master Integration Document*
