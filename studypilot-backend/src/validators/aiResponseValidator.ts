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
  return sanitizeGuideData(parseAiJsonObject(rawResponse));
}

export function parseAiJsonObject(rawResponse: string): any {
  // Strip any accidental markdown fences
  let jsonString = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = parseJsonLenient(jsonString);
  } catch (parseError) {
    // Try to extract JSON from the response if it's wrapped in text
    const extractedJson = extractFirstJsonObject(jsonString);
    if (extractedJson) {
      try {
        parsed = parseJsonLenient(extractedJson);
      } catch {
        throw new Error('AI returned malformed JSON. Please try again.');
      }
    } else {
      throw new Error('AI response did not contain valid JSON. Please try again.');
    }
  }

  return parsed;
}

function parseJsonLenient(jsonString: string): any {
  const cleaned = escapeControlCharactersInsideStrings(jsonString)
    .replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(cleaned);
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
}

function escapeControlCharactersInsideStrings(jsonString: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of jsonString) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString && char === '\n') {
      result += '\\n';
      continue;
    }

    if (inString && char === '\r') {
      result += '\\r';
      continue;
    }

    if (inString && char === '\t') {
      result += '\\t';
      continue;
    }

    result += char;
  }

  return result;
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
  if (value !== null && value !== undefined) return String(value).trim();
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
