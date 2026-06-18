import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { resourceSchema } from '../validators/phase3.validator';
import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import { searchYouTube } from '../services/youtube.service';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

// GET /api/v1/resources
export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId, topic } = req.query;

    const whereClause: any = { userId };
    if (guideId) whereClause.guideId = String(guideId);
    if (topic) whereClause.topic = String(topic);

    const resources = await prisma.resource.findMany({
      where: whereClause,
      orderBy: { savedAt: 'desc' },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      resources: resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url,
        type: r.type,
        topic: r.topic,
        guideId: r.guideId,
        guideTitle: r.guide?.title || null,
        notes: r.notes,
        savedAt: r.savedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/resources
export async function saveResource(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const validated = resourceSchema.parse(req.body);

    const resource = await prisma.resource.create({
      data: {
        userId,
        title: validated.title,
        url: validated.url || null,
        type: validated.type || 'ARTICLE',
        topic: validated.topic || null,
        guideId: validated.guideId || null,
        notes: validated.notes || null,
      },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        url: resource.url,
        type: resource.type,
        topic: resource.topic,
        guideId: resource.guideId,
        guideTitle: resource.guide?.title || null,
        notes: resource.notes,
        savedAt: resource.savedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/resources/:resourceId
export async function getResourceDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { resourceId } = req.params;
    const userId = req.user!.userId;

    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json(ApiResponse.error('Resource not found.', 404));
    }

    return res.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        url: resource.url,
        type: resource.type,
        topic: resource.topic,
        guideId: resource.guideId,
        guideTitle: resource.guide?.title || null,
        notes: resource.notes,
        savedAt: resource.savedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/resources/:resourceId
export async function updateResource(req: Request, res: Response, next: NextFunction) {
  try {
    const { resourceId } = req.params;
    const userId = req.user!.userId;
    const validated = resourceSchema.partial().parse(req.body);

    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      return res.status(404).json(ApiResponse.error('Resource not found.', 404));
    }

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.url !== undefined) updateData.url = validated.url;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.topic !== undefined) updateData.topic = validated.topic;
    if (validated.guideId !== undefined) updateData.guideId = validated.guideId;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: updateData,
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      resource: {
        id: updated.id,
        title: updated.title,
        url: updated.url,
        type: updated.type,
        topic: updated.topic,
        guideId: updated.guideId,
        guideTitle: updated.guide?.title || null,
        notes: updated.notes,
        savedAt: updated.savedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/resources/:resourceId
export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    const { resourceId } = req.params;
    const userId = req.user!.userId;

    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      return res.status(404).json(ApiResponse.error('Resource not found.', 404));
    }

    await prisma.resource.delete({
      where: { id: resourceId },
    });

    return res.json({
      success: true,
      message: 'Resource deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/resources/guide/:guideId
export async function getResourcesByGuide(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const resources = await prisma.resource.findMany({
      where: { userId, guideId },
      orderBy: { savedAt: 'desc' },
    });

    return res.json({
      success: true,
      resources: resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url,
        type: r.type,
        topic: r.topic,
        guideId: r.guideId,
        notes: r.notes,
        savedAt: r.savedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/resources/suggest
export async function suggestResources(req: Request, res: Response, next: NextFunction) {
  try {
    const { topic, guideId, type } = req.body;
    const userId = req.user!.userId;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json(ApiResponse.error('topic is required in request body', 400));
    }

    let guideTitle = 'General Study';
    if (guideId) {
      const guide = await prisma.guide.findFirst({
        where: { id: guideId, userId },
      });
      if (guide) {
        guideTitle = guide.title;
      }
    }

    // Fetch actual working YouTube videos/playlists for the requested topic if video/course is allowed
    let ytResults: any[] = [];
    if (!type || type === 'ALL' || type === 'VIDEO' || type === 'COURSE') {
      try {
        ytResults = await searchYouTube(topic);
      } catch (ytErr) {
        console.error('[resource.controller] Failed to search YouTube:', ytErr);
      }
    }

    const ytContext = ytResults.length > 0 
      ? `Here is a list of actual, existing and verified YouTube videos and playlists for the topic "${topic}":\n` + 
        ytResults.map((r, i) => `${i+1}. TITLE: "${r.title}", URL: "${r.url}", TYPE: "${r.isPlaylist ? 'PLAYLIST' : 'VIDEO'}"`).join('\n') +
        `\nCRITICAL: If you suggest a 'VIDEO' or 'COURSE' that refers to a video/playlist, you MUST choose the URL from the verified list above. Do NOT hallucinate any other YouTube URLs.`
      : '';

    const typeInstruction = type && type !== 'ALL'
      ? `CRITICAL: You MUST strictly generate suggestions that are of type "${type}". Do NOT suggest any other types of resources.`
      : 'Provide a mix of high-quality, actual online resources (e.g. documentation sites, specific popular YouTube tutorials, educational articles, textbooks, interactive tools).';

    const prompt = `
      You are an academic resource finder for StudyPilot AI.
      The student is studying the topic "${topic}" in the context of their guide "${guideTitle}".
      Provide 3 to 5 high-quality, actual online resources (e.g. documentation sites, specific popular YouTube tutorials, educational articles, textbooks, interactive tools) that are relevant to this topic.
      
      ${typeInstruction}
      
      ${ytContext}
      
      For each suggestion, provide:
      - Title of the resource
      - URL: 
        * CRITICAL: If type is 'VIDEO', use a verified YouTube URL from the list above. If the list is empty or doesn't have matches, use a highly popular, well-known YouTube video/playlist link. The URL must refer directly to a real and relevant video on YouTube. Do NOT use fake, placeholder, or generic non-YouTube domains for VIDEO type.
        * For other types: Use a valid, real, well-known standard URL like geeksforgeeks.org, neetcode.io, khanacademy.org, w3schools.com, developer.mozilla.org, wikipedia.org, etc.
      - Type: choose strictly from: VIDEO, ARTICLE, PAPER, BOOK, COURSE, TOOL, OTHER
      - Reason: 1 sentence explaining why this resource is highly beneficial for learning this specific topic. If the topic mentions a language like 'hindi', 'urdu', 'spanish', etc., prioritize resources that teach in that language.

      Return the suggestions strictly as a JSON object in this exact format:
      {
        "topic": "${topic}",
        "suggestions": [
          {
            "title": "Resource Name",
            "url": "https://...",
            "type": "VIDEO" | "ARTICLE" | "PAPER" | "BOOK" | "COURSE" | "TOOL" | "OTHER",
            "reason": "Why it is useful..."
          }
        ]
      }

      Respond ONLY with the valid JSON block, no markdown, no conversational text.
    `;

    const result = await groq.chat.completions.create({
      model: ENV.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    const cleanJsonStr = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    return res.json({
      success: true,
      topic: parsed.topic || topic,
      suggestions: parsed.suggestions || [],
    });
  } catch (err) {
    next(err);
  }
}
