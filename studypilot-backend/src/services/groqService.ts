import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import type { ComponentKey } from './guideGenerationService';

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
  return text.substring(0, MAX_INPUT_CHARS) + 
    '\n\n[Content truncated to fit processing limits. The above represents the main content.]';
}

function buildSystemPrompt(components: ComponentKey[]): string {
  const needsFlashcards = components.includes('flashcards');
  const needsQuiz = components.includes('quiz');
  const needsRevision = components.includes('revisionSheet');
  const needsMindMap = components.includes('mindMap');

  const rules = [
    `1. Respond ONLY with a valid JSON object. No markdown, no preamble, no explanation.`,
    `2. Do not wrap the JSON in code blocks (\`\`\`). Return raw JSON only.`,
    `3. All string values must be properly escaped (no unescaped quotes inside strings).`,
    `4. Arrays must never be empty — always include at least one item.`,
    `5. If content is insufficient for a field, provide a reasonable placeholder.`,
    needsFlashcards
      ? `6. Generate exactly 5 flashcards with question, answer, and difficulty.`
      : `6. For flashcards: return an empty array [].`,
    needsQuiz
      ? `7. Generate exactly 3 quiz questions, multiple-choice with exactly 4 options each. Always identify the correct answer index (0-3).`
      : `7. For quizQuestions: return an empty array [].`,
    needsRevision
      ? `8. Generate a concise revision sheet with 2-4 sections.`
      : `8. For revisionSheet: return { "title": "", "sections": [] }.`,
    needsMindMap
      ? `9. Generate a rich, detailed topicHierarchy with at least 5 main topics, each with 2-5 subtopics, for the mind map visualization.`
      : `9. Generate a standard topicHierarchy.`,
    `10. Keep all text values concise to minimise output size.`,
  ].join('\n');

  return `You are StudyPilot, an expert educational assistant specialising in generating comprehensive study materials.

Your task is to analyse provided educational content and produce a fully structured JSON study guide.

STRICT RULES:
${rules}`;
}

function buildUserPrompt(content: string, components: ComponentKey[]): string {
  const needsFlashcards = components.includes('flashcards');
  const needsQuiz = components.includes('quiz');
  const needsRevision = components.includes('revisionSheet');

  const flashcardsExample = needsFlashcards
    ? `[
    {
      "question": "string",
      "answer": "string",
      "difficulty": "easy | medium | hard"
    }
  ]`
    : `[]`;

  const quizExample = needsQuiz
    ? `[
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": 0,
      "explanation": "string (why this answer is correct)"
    }
  ]`
    : `[]`;

  const revisionExample = needsRevision
    ? `{
    "title": "string",
    "sections": [
      {
        "heading": "string",
        "bulletPoints": ["string", "string"]
      }
    ]
  }`
    : `{ "title": "", "sections": [] }`;

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
  "flashcards": ${flashcardsExample},
  "quizQuestions": ${quizExample},
  "revisionSheet": ${revisionExample}
}`;
}

export async function generateGuideWithGroq(cleanedContent: string, components?: ComponentKey[]): Promise<string> {
  const resolvedComponents = components || ['summary', 'flashcards', 'quiz', 'mindMap', 'studyPlan', 'revisionSheet', 'doubtSolver'];
  const truncated = truncateToTokenLimit(cleanedContent);
  const systemPrompt = buildSystemPrompt(resolvedComponents as ComponentKey[]);
  const userPrompt = buildUserPrompt(truncated, resolvedComponents as ComponentKey[]);

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
  maxRetries: number = 3,
  components?: ComponentKey[]
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateGuideWithGroq(cleanedContent, components);
    } catch (error: any) {
      lastError = error;

      if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 413) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Groq] Attempt ${attempt} failed: ${error.message || error}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to generate guide with Groq after retries.');
}
