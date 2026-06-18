import axios from 'axios';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  if (!ENV.TAVILY_API_KEY) {
    throw new AppError(
      'Live web search is not configured. Add TAVILY_API_KEY to the backend .env file.',
      503,
      'WEB_SEARCH_NOT_CONFIGURED'
    );
  }

  const maxResults = Math.max(1, Math.min(ENV.WEB_SEARCH_MAX_RESULTS || 5, 8));

  const { data } = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: ENV.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: maxResults,
    },
    { timeout: 15000 }
  );

  const results = Array.isArray(data?.results) ? data.results : [];

  return results
    .map((result: TavilyResult) => ({
      title: result.title || 'Web result',
      url: result.url || '',
      content: result.content || result.snippet || '',
    }))
    .filter((result: WebSearchResult) => result.url && result.content);
}
