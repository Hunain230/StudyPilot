import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { streamPDF, addSection, addTable } from '../services/pdf.service';
import { computeReadiness, getReadinessStatus } from '../services/readiness.service';
import { computeWeakTopics } from '../services/weakTopic.service';
import { getQuestionTopic } from '../services/weakTopic.service';

type KeyConcept = {
  term?: string;
  definition?: string;
};

type TopicHierarchyItem = {
  topic?: string;
  subtopics?: string[];
};

function parseJson(value: any) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function asArray<T>(value: any): T[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function safePdfFilename(title: string) {
  const safeTitle = title
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);

  return `StudyPilot-Guide-${safeTitle || 'Study-Guide'}.pdf`;
}

// GET /api/v1/export/guide/:guideId/content
export async function exportGuideContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const guide = await prisma.guide.findFirst({
      where: { id: guideId, userId },
      include: {
        content: true,
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const content = guide.content;
    const keyConcepts = asArray<KeyConcept>(content?.keyConcepts);
    const topicHierarchy = asArray<TopicHierarchyItem>(content?.topicHierarchy);
    const metadata = parseJson(content?.metadata) || {};
    const filename = safePdfFilename(guide.title);

    streamPDF(
      res,
      filename,
      (doc) => {
        doc.fontSize(18).fillColor('#0f172a').font('Helvetica-Bold').text(guide.title, { width: 495 });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#4b5563').font('Helvetica');
        doc.text(`Subject: ${guide.subject || metadata.subject || 'General'}`);
        doc.text(`Source Type: ${guide.sourceType.toUpperCase()}`);
        doc.text(`Created: ${guide.createdAt.toLocaleDateString()}`);
        if (metadata.estimatedReadingTime || metadata.difficulty || metadata.wordCount) {
          doc.text(
            `Reading Time: ${metadata.estimatedReadingTime || 'N/A'} | Difficulty: ${metadata.difficulty || 'N/A'} | Words: ${metadata.wordCount || 'N/A'}`
          );
        }
        if (guide.description) {
          doc.moveDown(0.5);
          doc.fillColor('#374151').font('Helvetica-Oblique').text(guide.description, { width: 495 });
        }

        addSection(doc, 'Key Summary');
        if (content?.shortSummary) {
          doc.fontSize(10).fillColor('#334155').font('Helvetica').text(content.shortSummary, {
            align: 'justify',
            width: 495,
          });
        } else {
          doc.text('No key summary was generated for this guide.');
        }

        addSection(doc, 'Detailed Explanations');
        if (content?.detailedSummary) {
          doc.fontSize(10).fillColor('#334155').font('Helvetica').text(content.detailedSummary, {
            align: 'justify',
            width: 495,
          });
        } else {
          doc.text('No detailed explanation was generated for this guide.');
        }

        addSection(doc, 'Key Concepts');
        if (keyConcepts.length > 0) {
          keyConcepts.forEach((concept, index) => {
            const term = concept.term || `Concept ${index + 1}`;
            doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(term, { width: 495 });
            doc.fontSize(9).fillColor('#334155').font('Helvetica').text(concept.definition || 'No definition provided.', {
              width: 495,
            });
            doc.moveDown(0.6);
          });
        } else {
          doc.fontSize(10).fillColor('#334155').font('Helvetica').text('No key concepts were generated for this guide.');
        }

        addSection(doc, 'Topic Outline');
        if (topicHierarchy.length > 0) {
          topicHierarchy.forEach((topicNode, index) => {
            doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(`${index + 1}. ${topicNode.topic || 'Untitled Topic'}`, {
              width: 495,
            });

            const subtopics = Array.isArray(topicNode.subtopics) ? topicNode.subtopics : [];
            if (subtopics.length > 0) {
              subtopics.forEach((subtopic) => {
                doc.fontSize(9).fillColor('#334155').font('Helvetica').text(`- ${subtopic}`, {
                  indent: 15,
                  width: 480,
                });
              });
            }
            doc.moveDown(0.6);
          });
        } else {
          const topics = asArray<string>(content?.topics);
          if (topics.length > 0) {
            topics.forEach((topic) => {
              doc.fontSize(9).fillColor('#334155').font('Helvetica').text(`- ${topic}`, { width: 495 });
            });
          } else {
            doc.fontSize(10).fillColor('#334155').font('Helvetica').text('No topic outline was generated for this guide.');
          }
        }
      },
      {
        subtitle: `Study Guide Export - Generated: ${new Date().toLocaleString()}`,
      }
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/export/guide/:guideId
export async function exportGuideReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const guide = await prisma.guide.findFirst({
      where: { id: guideId, userId },
      include: {
        content: true,
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const readinessScore = await computeReadiness(userId, guideId);
    const readinessInfo = getReadinessStatus(readinessScore);

    const weakTopics = await computeWeakTopics(userId, guideId);

    const totalCards = await prisma.flashcard.count({ where: { guideId } });
    const reviews = await prisma.flashcardReview.findMany({
      where: { userId, card: { guideId } },
    });
    const masteredCount = reviews.filter(r => r.repetitions >= 2).length;

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId: guideId },
      orderBy: { attemptedAt: 'desc' },
      take: 10,
    });

    const filename = `StudyPilot-Guide-Report-${guideId.substring(0, 8)}.pdf`;

    streamPDF(res, filename, (doc) => {
      // 1. Metadata Section
      doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text(guide.title);
      doc.moveDown(0.2);
      if (guide.subject) {
        doc.fontSize(10).fillColor('#4b5563').font('Helvetica').text(`Subject: ${guide.subject}`);
      }
      doc.fontSize(9).fillColor('#6b7280').text(`Source Type: ${guide.sourceType.toUpperCase()} | Created: ${guide.createdAt.toLocaleDateString()}`);
      doc.moveDown(0.5);
      if (guide.description) {
        doc.fontSize(10).fillColor('#374151').font('Helvetica-Oblique').text(guide.description);
      }
      doc.moveDown(1);

      // 2. Exam Readiness Score
      addSection(doc, 'Exam Readiness Status');
      doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text(`Overall Score: ${readinessScore}/100`);
      doc.fontSize(11).fillColor(readinessInfo.color).text(`Status: ${readinessInfo.status}`);
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#334155').font('Helvetica');
      
      let recommendation = 'Keep studying to build consistency and practice quizzes to check performance.';
      if (weakTopics.length > 0) {
        recommendation = `Focus on improving your weak topics: ${weakTopics.map(t => t.topic).join(', ')}. Try generating more quiz sessions or reviewing flashcards for these sections.`;
      } else if (readinessScore >= 85) {
        recommendation = 'Excellent progress! You are fully ready for the exam. Keep reviewing to maintain recall.';
      }
      doc.text(`Study Recommendation: ${recommendation}`, { width: 495 });
      doc.moveDown(1.5);

      // 3. Weak Topics Table
      addSection(doc, 'Weak Topics Detection (Rolling Accuracy)');
      if (weakTopics.length > 0) {
        const headers = ['Topic Name', 'Accuracy (%)', 'Total Attempts'];
        const rows = weakTopics.map(wt => [
          wt.topic,
          `${wt.accuracy.toFixed(1)}%`,
          String(wt.totalAttempted),
        ]);
        addTable(doc, headers, rows, [250, 120, 125]);
      } else {
        doc.text('No weak topics detected (accuracy is >= 60% across all attempted topics). Keep it up!');
        doc.moveDown(1);
      }

      // 4. Flashcard Mastery
      addSection(doc, 'Flashcard Mastery Summary');
      const masteryPercent = totalCards > 0 ? ((masteredCount / totalCards) * 100).toFixed(1) : '0';
      doc.text(`Total Flashcards: ${totalCards}`);
      doc.text(`Mastered Cards (reviewed 2+ times correctly): ${masteredCount} (${masteryPercent}%)`);
      doc.text(`Active Learning Cards: ${reviews.length - masteredCount}`);
      doc.text(`New / Unreviewed Cards: ${totalCards - reviews.length}`);
      doc.moveDown(1.5);

      // 5. Quiz Performance (Last 10 attempts)
      addSection(doc, 'Recent Quiz Performance (Last 10 Attempts)');
      if (attempts.length > 0) {
        const headers = ['Attempt Date', 'Score (%)', 'Correct', 'Incorrect', 'Skipped'];
        const rows = attempts.map(a => [
          new Date(a.attemptedAt).toLocaleDateString(),
          `${Number(a.score).toFixed(1)}%`,
          String(a.correct),
          String(a.incorrect),
          String(a.skipped),
        ]);
        addTable(doc, headers, rows, [130, 90, 90, 90, 95]);
      } else {
        doc.text('No quiz attempts registered yet.');
        doc.moveDown(1);
      }

      // 6. Detailed Summary Section
      if (guide.content && (guide.content.shortSummary || guide.content.detailedSummary)) {
        addSection(doc, 'Guide Concept Outline');
        const summary = guide.content.shortSummary || guide.content.detailedSummary || '';
        doc.fontSize(10).fillColor('#334155').text(summary.substring(0, 3000) + (summary.length > 3000 ? '...' : ''), { align: 'justify', width: 495 });
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/export/quiz/:attemptId
export async function exportQuizAttemptReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId } = req.params;
    const userId = req.user!.userId;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        guide: {
          select: {
            title: true,
            content: { select: { topics: true } },
          },
        },
        results: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json(ApiResponse.error('Quiz attempt not found.', 404));
    }

    let guideTopicsList: string[] = [];
    if (attempt.guide?.content?.topics) {
      try {
        const parsed = typeof attempt.guide.content.topics === 'string'
          ? JSON.parse(attempt.guide.content.topics)
          : attempt.guide.content.topics;
        if (Array.isArray(parsed)) {
          guideTopicsList = parsed.map(String);
        }
      } catch (e) {
        // ignore
      }
    }

    const filename = `StudyPilot-Quiz-Attempt-${attemptId.substring(0, 8)}.pdf`;

    streamPDF(res, filename, (doc) => {
      // Title Block
      doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text(`Quiz Attempt Report`);
      doc.fontSize(11).fillColor('#4b5563').font('Helvetica').text(`Guide: ${attempt.guide?.title || 'Unknown Guide'}`);
      doc.fontSize(9).fillColor('#6b7280').text(`Attempted on: ${attempt.attemptedAt.toLocaleString()} | Time Taken: ${attempt.timeTakenSec ? `${Math.floor(attempt.timeTakenSec / 60)}m ${attempt.timeTakenSec % 60}s` : 'N/A'}`);
      doc.moveDown(1);

      // Score Metrics
      addSection(doc, 'Score Summary');
      doc.fontSize(14).fillColor('#2563eb').font('Helvetica-Bold').text(`Score: ${Number(attempt.score).toFixed(1)}%`);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#334155').font('Helvetica');
      doc.text(`Total Questions: ${attempt.totalQuestions}`);
      doc.text(`Correct Answers: ${attempt.correct}`);
      doc.text(`Incorrect Answers: ${attempt.incorrect}`);
      doc.text(`Skipped Questions: ${attempt.skipped}`);
      doc.moveDown(1.5);

      // Question-by-Question Breakdown
      addSection(doc, 'Per-Question Detailed Breakdown');
      
      attempt.results.forEach((r, index) => {
        // Topic mapping
        const topic = r.question.question ? getQuestionTopic(r.question.question, guideTopicsList) : 'General';
        
        doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(`Q${index + 1}. ${r.question.question}`);
        doc.fontSize(9).fillColor('#4b5563').font('Helvetica').text(`Topic: ${topic}`);
        
        const options = Array.isArray(r.question.options) ? r.question.options as string[] : [];
        const correctIndex = r.question.correctAnswerIndex;
        const selectedIndex = r.selectedOpt !== null ? parseInt(r.selectedOpt, 10) : null;

        // Render options list
        options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
          let prefix = `  [ ] ${letter}. `;
          let optColor = '#4b5563';

          if (optIdx === correctIndex) {
            prefix = `  [Correct] ${letter}. `;
            optColor = '#10b981'; // green
          } else if (optIdx === selectedIndex && !r.isCorrect) {
            prefix = `  [Selected - Wrong] ${letter}. `;
            optColor = '#ef4444'; // red
          } else if (optIdx === selectedIndex && r.isCorrect) {
            prefix = `  [Selected - Correct] ${letter}. `;
            optColor = '#10b981'; // green
          }

          doc.fillColor(optColor).text(`${prefix}${opt}`);
        });

        doc.fillColor(r.isCorrect ? '#10b981' : r.selectedOpt === null ? '#f59e0b' : '#ef4444').font('Helvetica-Bold');
        doc.text(r.isCorrect ? '✓ Correct' : r.selectedOpt === null ? '⚠ Skipped' : '✗ Incorrect');
        
        if (r.question.explanation) {
          doc.fillColor('#334155').font('Helvetica-Oblique').text(`Explanation: ${r.question.explanation}`, { width: 495 });
        }
        
        doc.moveDown(1);
        
        // Draw divider
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#f1f5f9').lineWidth(1).stroke();
        doc.moveDown(0.8);
      });
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/export/analytics
export async function exportAnalyticsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const totalGuides = await prisma.guide.count({ where: { userId } });
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      select: { score: true },
    });

    const averageQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + Number(a.score), 0) / quizAttempts.length
      : 0;

    const masteredCards = await prisma.flashcardReview.count({
      where: { userId, repetitions: { gte: 2 } },
    });

    const studySessions = await prisma.studySession.findMany({
      where: { userId },
      select: { durationSecs: true },
    });
    const totalStudyMinutes = studySessions.reduce((sum, s) => sum + Math.round(s.durationSecs / 60), 0);

    const guides = await prisma.guide.findMany({
      where: { userId },
      select: { id: true, title: true, subject: true },
    });

    // Fetch readiness for each guide
    const guidesWithReadiness: Array<{ title: string; subject: string; readiness: string }> = [];
    for (const g of guides) {
      const score = await computeReadiness(userId, g.id);
      const status = getReadinessStatus(score);
      guidesWithReadiness.push({
        title: g.title,
        subject: g.subject || 'N/A',
        readiness: `${score}% (${status.status})`,
      });
    }

    const weakTopics = await computeWeakTopics(userId);

    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
      take: 10,
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    const filename = `StudyPilot-Analytics-Report.pdf`;

    streamPDF(res, filename, (doc) => {
      doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text(`Overall Learning Analytics Summary`);
      doc.moveDown(1);

      // Overview KPI Blocks
      addSection(doc, 'High-Level Statistics');
      doc.fontSize(10).fillColor('#334155').font('Helvetica');
      doc.text(`Total Study Guides Created: ${totalGuides}`);
      doc.text(`Total Quiz Attempts Submitted: ${quizAttempts.length}`);
      doc.text(`Average Quiz Performance Accuracy: ${averageQuizScore.toFixed(1)}%`);
      doc.text(`Mastered Flashcards Count: ${masteredCards}`);
      doc.text(`Total Time Invested (minutes): ${totalStudyMinutes}m`);
      doc.moveDown(1.5);

      // Guides list table
      addSection(doc, 'Study Guides & Readiness Scores');
      if (guidesWithReadiness.length > 0) {
        const headers = ['Guide Title', 'Subject', 'Readiness Score'];
        const rows = guidesWithReadiness.map(gr => [
          gr.title,
          gr.subject,
          gr.readiness,
        ]);
        addTable(doc, headers, rows, [220, 130, 145]);
      } else {
        doc.text('No study guides created yet.');
        doc.moveDown(1);
      }

      // Weak topics list
      addSection(doc, 'rolling Weak Topics Detected (Accuracy < 60%)');
      if (weakTopics.length > 0) {
        const headers = ['Topic Name', 'Accuracy (%)', 'Attempts Count'];
        const rows = weakTopics.map(wt => [
          wt.topic,
          `${wt.accuracy.toFixed(1)}%`,
          String(wt.totalAttempted),
        ]);
        addTable(doc, headers, rows, [250, 120, 125]);
      } else {
        doc.text('No weak topics currently detected. Great performance!');
        doc.moveDown(1);
      }

      // Recent attempts table
      addSection(doc, 'Recent Quiz Attempts (Last 10 Attempts)');
      if (recentAttempts.length > 0) {
        const headers = ['Attempt Date', 'Guide Title', 'Score (%)', 'Result (C/I/S)'];
        const rows = recentAttempts.map(a => [
          new Date(a.attemptedAt).toLocaleDateString(),
          a.guide?.title || 'Unknown Guide',
          `${Number(a.score).toFixed(1)}%`,
          `${a.correct} / ${a.incorrect} / ${a.skipped}`,
        ]);
        addTable(doc, headers, rows, [100, 200, 90, 105]);
      } else {
        doc.text('No quiz attempts logged.');
        doc.moveDown(1);
      }
    });
  } catch (err) {
    next(err);
  }
}
