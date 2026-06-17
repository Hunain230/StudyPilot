import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

let pipelinePromise: Promise<any> | null = null;
let extractor: any = null;

// Initialize the transformers pipeline asynchronously
async function getExtractor() {
  if (extractor) return extractor;

  if (!pipelinePromise) {
    // Dynamically import @xenova/transformers to ensure correct resolution in CommonJS/ESM contexts
    pipelinePromise = import('@xenova/transformers').then(async (m) => {
      // Configure it to disable local model searches and run smoothly in node
      m.env.allowLocalModels = false;
      return m.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    });
  }

  extractor = await pipelinePromise;
  return extractor;
}

/**
 * Generates numerical vector embeddings for a given text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const embed = await getExtractor();
    const output = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error: any) {
    console.error('[VectorStore] Embedding generation failed:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Splices text into overlapping word chunks.
 */
export function chunkText(text: string, size = 500, overlap = 50): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(' ');
    if (chunk) chunks.push(chunk);
    if (i + size >= words.length) break;
  }

  return chunks;
}

/**
 * Indexes a guide's raw content and writes it as a local JSON file.
 */
export async function indexGuide(guideId: string, text: string): Promise<number> {
  console.log(`[VectorStore] Indexing guide: ${guideId}`);
  const chunks = chunkText(text, 500, 50);
  
  if (chunks.length === 0) {
    console.warn(`[VectorStore] Empty content for guide: ${guideId}. Skipping indexing.`);
    return 0;
  }

  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    const emb = await getEmbedding(chunks[i]);
    embeddings.push(emb);
  }

  const indexData = {
    guideId,
    chunks: chunks.map((chunk, idx) => ({
      content: chunk,
      embedding: embeddings[idx],
    })),
  };

  const storeDir = path.resolve(ENV.VECTOR_STORE_PATH);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(storeDir, `${guideId}.json`),
    JSON.stringify(indexData)
  );

  console.log(`[VectorStore] Guide ${guideId} indexed successfully with ${chunks.length} chunks.`);
  return chunks.length;
}

function dotProduct(a: number[], b: number[]): number {
  let product = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    product += a[i] * b[i];
  }
  return product;
}

/**
 * Retrieves top K relevant text chunks using cosine similarity.
 */
export async function retrieveChunks(guideId: string, query: string, k = 5): Promise<string[]> {
  const storeDir = path.resolve(ENV.VECTOR_STORE_PATH);
  const indexPath = path.join(storeDir, `${guideId}.json`);

  if (!fs.existsSync(indexPath)) {
    console.warn(`[VectorStore] RAG index file not found at ${indexPath}. Attempting fallback index...`);
    // Try to auto-index if we have the guide raw content in the database
    const { prisma } = require('../config/db');
    const content = await prisma.guideContent.findUnique({ where: { guideId } });
    if (content && content.rawContent) {
      await indexGuide(guideId, content.rawContent);
    } else {
      throw new Error(`RAG_INDEX_MISSING`); // Express error handler maps this code
    }
  }

  try {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const queryEmb = await getEmbedding(query);

    const scoredChunks = indexData.chunks.map((c: any) => {
      const score = dotProduct(c.embedding, queryEmb);
      return { content: c.content, score };
    });

    // Sort descending by similarity score
    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    return scoredChunks.slice(0, k).map((c: any) => c.content);
  } catch (error: any) {
    console.error(`[VectorStore] Retrieval failed for guide ${guideId}:`, error);
    throw error;
  }
}
