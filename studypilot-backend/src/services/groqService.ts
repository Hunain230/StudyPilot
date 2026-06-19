import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import type { ComponentKey } from './guideGenerationService';
import { parseAiJsonObject } from '../validators/aiResponseValidator';
import { searchWeb, WebSearchResult } from './webSearchService';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

const MODEL = ENV.GROQ_MODEL || 'llama-3.1-8b-instant';
const MAX_TOKENS = ENV.GROQ_MAX_TOKENS || 3000;
const TEMPERATURE = ENV.GROQ_TEMPERATURE || 0.3;
const SECTION_AGENT_CONCURRENCY = 2;
const SECTION_AGENT_MAX_TOKENS = Math.min(MAX_TOKENS, 2200);
const MAX_WEB_QUERIES = 2;
const MAX_WEB_RESULTS_PER_QUERY = 3;
const DETAILED_SUMMARY_SECTIONS = ['Introduction', 'Main Idea', 'Intuition', 'Applications', 'Conclusion'] as const;

type DetailedSummarySection = typeof DETAILED_SUMMARY_SECTIONS[number];

interface DetailedSummaryAgentInput {
  title?: string;
  content: string;
  shortSummary: string;
  topics: string[];
  keyConcepts: Array<{ term: string; definition: string }>;
  webContext?: string;
}

interface DetailedSummaryAgentResult {
  section: DetailedSummarySection;
  body: string;
}

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
    `10. The detailedSummary string must contain exactly these five section headings in this order: Introduction, Main Idea, Intuition, Applications, Conclusion.`,
    `11. Because detailedSummary is a JSON string, separate those headings and paragraphs with escaped newline characters like \\n, never literal unescaped line breaks inside the string.`,
    `12. Keep all text values concise to minimise output size.`,
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
  "detailedSummary": "Introduction\\n1 concise paragraph.\\n\\nMain Idea\\n1 concise paragraph.\\n\\nIntuition\\n1 concise paragraph.\\n\\nApplications\\n1 concise paragraph.\\n\\nConclusion\\n1 concise paragraph.",
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

function cleanSearchTerm(value: string): string {
  return value
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDetailedSummarySearchQueries(input: {
  title?: string;
  shortSummary: string;
  topics: string[];
  keyConcepts: Array<{ term: string; definition: string }>;
}): string[] {
  const title = input.title ? cleanSearchTerm(input.title) : '';
  const topics = input.topics.slice(0, 4).map(cleanSearchTerm).filter(Boolean);
  const keyTerms = input.keyConcepts.slice(0, 3).map(c => cleanSearchTerm(c.term)).filter(Boolean);

  const queries = [
    [title, ...topics.slice(0, 3), 'study guide explanation'].filter(Boolean).join(' '),
    [...keyTerms, ...topics.slice(0, 2), 'concept applications intuition'].filter(Boolean).join(' '),
  ]
    .map(query => query.trim())
    .filter(query => query.length > 0);

  return Array.from(new Set(queries)).slice(0, MAX_WEB_QUERIES);
}

export function formatWebResultsForGuideGeneration(results: WebSearchResult[]): string {
  return results
    .map((result, index) => {
      const snippet = result.content.replace(/\s+/g, ' ').trim().slice(0, 700);
      return `[Web ${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${snippet}`;
    })
    .join('\n\n');
}

export async function getWebEnrichmentForDetailedSummary(input: {
  title?: string;
  shortSummary: string;
  topics: string[];
  keyConcepts: Array<{ term: string; definition: string }>;
}): Promise<string | null> {
  const queries = buildDetailedSummarySearchQueries(input);
  if (queries.length === 0) return null;

  try {
    const uniqueResults = new Map<string, WebSearchResult>();

    for (const query of queries) {
      const results = await searchWeb(query);
      const boundedResults = results.slice(0, MAX_WEB_RESULTS_PER_QUERY);

      for (const result of boundedResults) {
        if (!uniqueResults.has(result.url)) {
          uniqueResults.set(result.url, result);
        }
      }
    }

    const webResults = Array.from(uniqueResults.values());
    if (webResults.length === 0) return null;

    return formatWebResultsForGuideGeneration(webResults);
  } catch (err) {
    console.warn('[DetailedSummaryWeb] Continuing without web enrichment:', err);
    return null;
  }
}

function buildSectionAgentSystemPrompt(section: DetailedSummarySection): string {
  return `You are a StudyPilot specialist agent responsible only for the "${section}" section of a study guide.

Return ONLY a valid JSON object. No markdown, no code fences, no preamble.
The JSON shape must be exactly: { "section": "${section}", "body": "string" }.
The body must be 2-3 strong academic paragraphs with clear, student-friendly wording.`;
}

function buildSectionAgentUserPrompt(section: DetailedSummarySection, input: DetailedSummaryAgentInput): string {
  const topics = input.topics.length > 0 ? input.topics.join(', ') : 'General topic';
  const concepts = input.keyConcepts.length > 0
    ? input.keyConcepts.map(c => `${c.term}: ${c.definition}`).join('\n')
    : 'No extracted key concepts were provided.';
  const webContext = input.webContext?.trim()
    ? input.webContext
    : 'No external web reference context was available. Use only the source content and extracted guide context.';

  return `Write the "${section}" section for this study guide.

Section goal:
${getSectionGoal(section)}

Writing rules:
- Treat the source content as the primary theme, direction, and scope of the guide.
- Use the external web reference context only to enrich explanation depth, examples, intuition, and applications.
- Do not cite, quote, or invent URLs in the body. Do not add facts that are unsupported by either the source content or web snippets.
- Write 2-3 cohesive paragraphs for this section. Use clear academic language that a student can study from.

Short summary:
${input.shortSummary}

Topics:
${topics}

Key concepts:
${concepts}

Source content:
${input.content}

External web reference context:
${webContext}

Return JSON only:
{ "section": "${section}", "body": "2-3 polished paragraphs" }`;
}

function getSectionGoal(section: DetailedSummarySection): string {
  switch (section) {
    case 'Introduction':
      return 'Introduce the topic, why it matters, and what the learner should expect.';
    case 'Main Idea':
      return 'Explain the central concept or mechanism clearly and directly.';
    case 'Intuition':
      return 'Build an intuitive mental model using simple reasoning or analogy without becoming casual.';
    case 'Applications':
      return 'Explain where the idea is used, practiced, or observed in real academic or practical contexts.';
    case 'Conclusion':
      return 'Summarise the takeaway and connect the section back to studying or revision.';
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex++;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  );

  await Promise.all(workers);
  return results;
}

async function generateDetailedSummarySection(
  section: DetailedSummarySection,
  input: DetailedSummaryAgentInput
): Promise<DetailedSummaryAgentResult> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: SECTION_AGENT_MAX_TOKENS,
    temperature: TEMPERATURE,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSectionAgentSystemPrompt(section) },
      { role: 'user', content: buildSectionAgentUserPrompt(section, input) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Groq returned an empty ${section} section response.`);
  }

  const parsed = parseAiJsonObject(content);
  const parsedSection = typeof parsed.section === 'string' ? parsed.section.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';

  if (parsedSection.toLowerCase() !== section.toLowerCase() || !body) {
    throw new Error(`Groq returned an invalid ${section} section response.`);
  }

  return { section, body };
}

function compileDetailedSummary(results: DetailedSummaryAgentResult[]): string {
  return DETAILED_SUMMARY_SECTIONS
    .map((section) => {
      const result = results.find(r => r.section === section);
      return `${section}\n${result?.body || ''}`;
    })
    .join('\n\n');
}

export async function generateDetailedSummaryWithAgents(input: DetailedSummaryAgentInput): Promise<string | null> {
  try {
    const results = await runWithConcurrency(
      [...DETAILED_SUMMARY_SECTIONS],
      SECTION_AGENT_CONCURRENCY,
      (section) => generateDetailedSummarySection(section, input)
    );

    if (
      results.length !== DETAILED_SUMMARY_SECTIONS.length ||
      results.some(result => !result.body.trim())
    ) {
      return null;
    }

    return compileDetailedSummary(results);
  } catch (err) {
    console.error('[DetailedSummaryAgents] Falling back to base detailedSummary:', err);
    return null;
  }
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
    response_format: { type: 'json_object' },
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
