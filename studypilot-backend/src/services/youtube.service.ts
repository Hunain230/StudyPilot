import axios from 'axios';

export interface YouTubeSearchResult {
  title: string;
  url: string;
  isPlaylist: boolean;
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    });

    const results: YouTubeSearchResult[] = [];

    // Parse ytInitialData JSON structure
    const match = data.match(/var ytInitialData = ({.*?});/);
    if (match) {
      try {
        const json = JSON.parse(match[1]);
        const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
        
        for (const item of contents) {
          if (item.videoRenderer) {
            const videoId = item.videoRenderer.videoId;
            const title = item.videoRenderer.title?.runs?.[0]?.text || item.videoRenderer.title?.accessibility?.accessibilityData?.label || 'YouTube Video';
            if (videoId && title) {
              results.push({
                title,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                isPlaylist: false
              });
            }
          } else if (item.playlistRenderer) {
            const playlistId = item.playlistRenderer.playlistId;
            const title = item.playlistRenderer.title?.runs?.[0]?.text || item.playlistRenderer.title?.simpleText || 'YouTube Playlist';
            if (playlistId && title) {
              results.push({
                title,
                url: `https://www.youtube.com/playlist?list=${playlistId}`,
                isPlaylist: true
              });
            }
          }
          if (results.length >= 8) break; // Keep first 8
        }
      } catch (jsonErr) {
        console.error('[YouTubeService] Error parsing ytInitialData:', jsonErr);
      }
    }

    // Fallback simple regex parsing if JSON parsing was empty or failed
    if (results.length === 0) {
      const videoMatches = data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
      if (videoMatches) {
        const uniqueIds = Array.from(new Set(videoMatches)).map((m: any) => m.split('=')[1]);
        for (const videoId of uniqueIds.slice(0, 5)) {
          results.push({
            title: `YouTube Video Tutorial (${videoId})`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isPlaylist: false
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.error('[YouTubeService] Failed to scrape search results:', err);
    return [];
  }
}
