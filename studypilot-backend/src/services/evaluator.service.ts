import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import { prisma } from '../config/db';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

export interface RawAnswer {
  questionId: string;
  selectedOption?: string | number; // e.g. "B", 1, or "1"
  writtenAnswer?: string;           // For open-ended
}

export interface QuestionRecord {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface EvaluationResult {
  scorePercent: number;
  correct: number;
  incorrect: number;
  skipped: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    selectedOptionIndex?: number;
    correctAnswerIndex: number;
    explanation: string;
  }>;
  topicMap: Record<string, { correct: number; total: number; scorePercent: number }>;
  weakTopics: string[];
}

// Convert option label (e.g. 'A', 'B', 'C', 'd') or number string to index 0-3
function parseSelectedOption(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  
  const cleanVal = val.toString().trim().toUpperCase();
  if (cleanVal === 'A') return 0;
  if (cleanVal === 'B') return 1;
  if (cleanVal === 'C') return 2;
  if (cleanVal === 'D') return 3;

  const idx = parseInt(cleanVal, 10);
  if (!isNaN(idx)) return idx;

  return null;
}

import { getQuestionTopic } from './weakTopic.service';

export async function evaluateAttempt(
  answers: RawAnswer[],
  questions: QuestionRecord[],
  guideTopics: string[] = []
): Promise<EvaluationResult> {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  
  const results: EvaluationResult['results'] = [];
  const topicMap: Record<string, { correct: number; total: number; scorePercent: number }> = {};

  for (const q of questions) {
    const userAnswer = answers.find(a => a.questionId === q.id);
    const selectedIdx = parseSelectedOption(userAnswer?.selectedOption);
    
    const topic = getQuestionTopic(q.question, guideTopics); 
    if (!topicMap[topic]) {
      topicMap[topic] = { correct: 0, total: 0, scorePercent: 0 };
    }
    topicMap[topic].total += 1;

    let isCorrect = false;

    if (selectedIdx === null) {
      skipped += 1;
    } else {
      isCorrect = selectedIdx === q.correctAnswerIndex;
      if (isCorrect) {
        correct += 1;
        topicMap[topic].correct += 1;
      } else {
        incorrect += 1;
      }
    }

    results.push({
      questionId: q.id,
      isCorrect,
      selectedOptionIndex: selectedIdx !== null ? selectedIdx : undefined,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation || '',
    });
  }

  // Calculate final metrics
  const scorePercent = questions.length > 0 ? (correct / questions.length) * 100 : 0;

  // Update topic score percents
  const weakTopics: string[] = [];
  for (const topic of Object.keys(topicMap)) {
    const t = topicMap[topic];
    t.scorePercent = t.total > 0 ? (t.correct / t.total) * 100 : 0;
    if (t.scorePercent < 60) {
      weakTopics.push(topic);
    }
  }

  return {
    scorePercent: parseFloat(scorePercent.toFixed(2)),
    correct,
    incorrect,
    skipped,
    results,
    topicMap,
    weakTopics,
  };
}

/**
 * Semantic grading helper using Groq for open-ended questions (for future compatibility).
 */
export async function gradeShortAnswer(
  questionText: string,
  modelAnswer: string,
  studentAnswer: string,
  maxPoints = 5
): Promise<{ score: number; feedback: string }> {
  try {
    const prompt = `
      Question: "${questionText}"
      Model Answer: "${modelAnswer}"
      Student Answer: "${studentAnswer}"

      Grade the student answer from 0 to ${maxPoints} points based on semantic accuracy compared to the model answer.
      Respond ONLY with a valid JSON in this exact structure: { "score": <number>, "feedback": "<string>" }
    `;

    const response = await groq.chat.completions.create({
      model: ENV.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty response');
    
    // Strip markdown fences
    const jsonStr = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      feedback: parsed.feedback || '',
    };
  } catch (error: any) {
    console.error('[Evaluator] Short answer AI grading failed:', error);
    return {
      score: 0,
      feedback: 'AI grading temporarily unavailable. Assigned 0 points.',
    };
  }
}
