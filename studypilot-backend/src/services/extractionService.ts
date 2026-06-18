import { PDFParse } from 'pdf-parse';
import { YoutubeTranscript } from 'youtube-transcript';
import { sanitizeNotes } from '../utils/textCleaner';

/**
 * Extracts text from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    
    if (!data.text || data.text.trim().length < 10) {
      throw new Error('PDF appears to be empty or contains only images. Please upload a text-based PDF.');
    }

    return data.text;
  } catch (error: any) {
    if (error.message.includes('PDF appears to be') || error.message.includes('Only PDF')) throw error;
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Retrieves metadata from a PDF buffer.
 */
export async function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; wordCount: number }> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return {
      pages: data.total,
      wordCount: data.text.split(/\s+/).filter(Boolean).length,
    };
  } catch (error: any) {
    throw new Error(`Failed to retrieve PDF metadata: ${error.message}`);
  }
}

/**
 * Validates and extracts notes text.
 */
export function extractTextFromNotes(rawNotes: string): string {
  if (!rawNotes || rawNotes.trim().length < 20) {
    throw new Error('Notes are too short. Please paste at least a few sentences (minimum 20 characters).');
  }

  if (rawNotes.length > 50000) {
    throw new Error('Notes exceed maximum length of 50,000 characters. Please split into multiple guides.');
  }

  return rawNotes.trim();
}

/**
 * Parses the YouTube video ID from various YouTube URL patterns.
 */
export function parseYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extracts transcripts from a YouTube URL.
 */
export async function extractTextFromYouTube(url: string): Promise<string> {
  const videoId = parseYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...');
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript available for this video. The video may have captions disabled or be unavailable in your region.');
    }

    // Combine all transcript segments into clean text
    const fullText = transcriptItems
      .map(item => item.text.trim())
      .filter(text => text.length > 0)
      .join(' ');

    if (fullText.length < 50) {
      throw new Error('Transcript is too short to generate a meaningful guide.');
    }

    // Replace HTML entities like &amp;#39; or &amp;quot; from transcripts
    const cleanedText = fullText
      .replace(/&amp;#39;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;quot;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;lt;/g, '<')
      .replace(/&lt;/g, '<')
      .replace(/&amp;gt;/g, '>')
      .replace(/&gt;/g, '>')
      .replace(/&amp;amp;/g, '&')
      .replace(/&amp;/g, '&');

    return cleanedText;
  } catch (error: any) {
    if (error.message.includes('transcript') || error.message.includes('captions') || error.message.includes('disabled')) {
      throw new Error('No transcript available for this video. The video may have captions disabled or be unavailable.');
    }
    throw new Error(`Failed to fetch YouTube transcript: ${error.message}`);
  }
}

export { sanitizeNotes };
