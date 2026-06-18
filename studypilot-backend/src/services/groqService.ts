import Groq from 'groq-sdk';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

const MODEL = ENV.GROQ_MODEL || 'llama-3.1-8b-instant';
const MAX_TOKENS = ENV.GROQ_MAX_TOKENS || 3000;
const TEMPERATURE = ENV.GROQ_TEMPERATURE || 0.3;

// Safe token limit for input (leave room for system prompt + response)
const MAX_INPUT_CHARS = 4000;

export function truncateToTokenLimit(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  
  // Truncate and add a clear note
  return text.substring(0, MAX_INPUT_CHARS) + 
    '\n\n[Content truncated to fit processing limits. The above represents the main content.]';
}

function buildSystemPrompt(): string {
  return `You are StudyPilot, an expert educational assistant specialising in generating comprehensive study materials.

Your task is to analyse provided educational content and produce a fully structured JSON study guide.

STRICT RULES:
1. Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation.
2. Do not wrap the JSON in code blocks (\`\`\`). Return raw JSON only.
3. All string values must be properly escaped (no unescaped quotes inside strings).
4. Arrays must never be empty — always include at least one item.
5. If content is insufficient for a field, provide a reasonable placeholder.
6. Generate exactly 5 flashcards, 3 quiz questions, and a concise revision sheet.
7. Quiz questions must be multiple-choice with exactly 4 options each.
8. Always identify the correct answer index (0-3) for quiz questions.
9. Keep all text values concise to minimise output size.`;
}

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

/**
 * Executes generateGuideWithGroq with exponential backoff on failure.
 */
export async function generateGuideWithGroqRetry(
  cleanedContent: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateGuideWithGroq(cleanedContent);
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable client errors (like 400 Bad Request, 401 Unauthorized, 403 Forbidden)
      if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 413) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
        console.warn(`[Groq] Attempt ${attempt} failed: ${error.message || error}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to generate guide with Groq after retries.');
}
