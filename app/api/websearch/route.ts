import { NextResponse } from 'next/server';

type WebItem = { title: string; url: string; snippet?: string; source: string };
type ImageItem = { url: string; title?: string; width?: number; height?: number; source: string };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function safeString(v: unknown) {
  return typeof v === 'string' ? v : '';
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

// Check if URL is a social media profile (NOT a search page)
function isSocialMediaUrl(url: string): boolean {
  const socialDomains = [
    'instagram.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'tiktok.com',
    'youtube.com',
    'linkedin.com',
    'pinterest.com',
    'snapchat.com',
    'reddit.com',
    'github.com',
    'vk.com',
    'telegram.org',
  ];
  
  // Exclude general search pages
  const excludePaths = ['/search', '/results', '/top/', '/people/', '/pages/'];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check if it's a social media domain
    const isSocialDomain = socialDomains.some((domain) => hostname.includes(domain));
    if (!isSocialDomain) return false;
    
    // Exclude search pages
    const isSearchPage = excludePaths.some((path) => pathname.includes(path));
    if (isSearchPage) return false;
    
    // Exclude root pages (facebook.com, linkedin.com without username)
    if (pathname === '/' || pathname === '') return false;
    
    // Must have a username/path (e.g., /username, /@username, /in/username)
    return pathname.length > 1;
  } catch {
    return false;
  }
}

// Get platform name from URL
function getPlatformName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'Twitter/X';
    if (hostname.includes('facebook')) return 'Facebook';
    if (hostname.includes('tiktok')) return 'TikTok';
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('pinterest')) return 'Pinterest';
    if (hostname.includes('snapchat')) return 'Snapchat';
    if (hostname.includes('reddit')) return 'Reddit';
    if (hostname.includes('github')) return 'GitHub';
    if (hostname.includes('vk.com')) return 'VKontakte';
    if (hostname.includes('telegram')) return 'Telegram';
    return 'Social Media';
  } catch {
    return 'Social Media';
  }
}

async function fetchDuckDuckGo(q: string): Promise<WebItem[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&t=websearch`;
  const t = withTimeout(8000);
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal });
  t.done();
  if (!res.ok) return [];
  const data: any = await res.json();
  const items: WebItem[] = [];

  const pushTopic = (t: any) => {
    const text = safeString(t?.Text);
    const firstURL = safeString(t?.FirstURL);
    if (text && firstURL) {
      items.push({
        title: text.split(' - ')[0] || text,
        url: firstURL,
        snippet: text,
        source: 'DuckDuckGo',
      });
    }
  };

  const rt = data?.RelatedTopics;
  if (Array.isArray(rt)) {
    for (const entry of rt) {
      if (entry?.Topics && Array.isArray(entry.Topics)) {
        for (const t of entry.Topics) pushTopic(t);
      } else {
        pushTopic(entry);
      }
      if (items.length >= 10) break;
    }
  }

  return items.slice(0, 10);
}

async function fetchWikipedia(q: string): Promise<WebItem[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=10&namespace=0&format=json`;
  const t = withTimeout(8000);
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal });
  t.done();
  if (!res.ok) return [];
  const data: any = await res.json();
  const titles: string[] = Array.isArray(data?.[1]) ? data[1] : [];
  const desc: string[] = Array.isArray(data?.[2]) ? data[2] : [];
  const urls: string[] = Array.isArray(data?.[3]) ? data[3] : [];
  const items: WebItem[] = [];
  for (let i = 0; i < Math.min(10, titles.length, urls.length); i++) {
    items.push({
      title: titles[i],
      url: urls[i],
      snippet: desc[i] || '',
      source: 'Wikipedia',
    });
  }
  return items;
}

// Search for social media profiles by name using SerpAPI
async function searchSocialMediaSerpAPI(q: string, apiKey: string): Promise<WebItem[]> {
  try {
    const t = withTimeout(10000);
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`,
      { signal: t.signal }
    );
    t.done();
    if (!res.ok) return [];
    const data: any = await res.json();
    const results: WebItem[] = [];
    
    // Check organic results for social media links
    if (Array.isArray(data?.organic_results)) {
      for (const item of data.organic_results) {
        const link = safeString(item?.link);
        if (link && isSocialMediaUrl(link)) {
          results.push({
            title: safeString(item?.title) || link,
            url: link,
            snippet: safeString(item?.snippet) || '',
            source: getPlatformName(link),
          });
        }
      }
    }
    
    // Check people_also_ask for social links
    if (Array.isArray(data?.people_also_ask)) {
      for (const item of data.people_also_ask) {
        const link = safeString(item?.link);
        if (link && isSocialMediaUrl(link)) {
          results.push({
            title: safeString(item?.title) || link,
            url: link,
            snippet: safeString(item?.snippet) || '',
            source: getPlatformName(link),
          });
        }
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Search for social media profiles using Google Custom Search
async function searchSocialMediaGoogle(q: string, apiKey: string, engineId: string): Promise<WebItem[]> {
  try {
    const t = withTimeout(10000);
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(engineId)}&q=${encodeURIComponent(q)}`,
      { signal: t.signal }
    );
    t.done();
    if (!res.ok) return [];
    const data: any = await res.json();
    const results: WebItem[] = [];
    
    if (Array.isArray(data?.items)) {
      for (const item of data.items) {
        const link = safeString(item?.link);
        if (link && isSocialMediaUrl(link)) {
          results.push({
            title: safeString(item?.title) || link,
            url: link,
            snippet: safeString(item?.snippet) || '',
            source: getPlatformName(link),
          });
        }
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Search for social media profiles using DuckDuckGo (filter results)
async function searchSocialMediaDuckDuckGo(q: string): Promise<WebItem[]> {
  const allResults = await fetchDuckDuckGo(q);
  return allResults.filter((item) => isSocialMediaUrl(item.url));
}

// Apify Instagram profile search
async function searchInstagramApify(username: string, token: string): Promise<WebItem | null> {
  try {
    // Extract username from query (remove @ if present)
    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) return null;
    
    const t = withTimeout(30000);
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startUrls: [{ url: `https://www.instagram.com/${cleanUsername}/` }],
        }),
        signal: t.signal,
      }
    );
    t.done();
    if (!runRes.ok) return null;
    
    const runData: any = await runRes.json();
    const runId = runData?.data?.id;
    if (!runId) return null;
    
    // Wait for completion (max 30 seconds)
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statusRes.ok) break;
      const statusData: any = await statusRes.json();
      if (statusData?.data?.status === 'SUCCEEDED') {
        const datasetId = runData?.data?.defaultDatasetId;
        if (datasetId) {
          const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dataRes.ok) {
            const profileData: any = await dataRes.json();
            if (Array.isArray(profileData) && profileData.length > 0) {
              const profile = profileData[0];
              return {
                title: safeString(profile?.fullName) || cleanUsername,
                url: `https://www.instagram.com/${cleanUsername}/`,
                snippet: safeString(profile?.biography) || '',
                source: 'Instagram',
              };
            }
          }
        }
        break;
      } else if (statusData?.data?.status === 'FAILED' || statusData?.data?.status === 'ABORTED') {
        break;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Apify TikTok profile search
async function searchTikTokApify(username: string, token: string): Promise<WebItem | null> {
  try {
    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) return null;
    
    const t = withTimeout(30000);
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~tiktok-user-scraper/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ usernames: [cleanUsername] }),
        signal: t.signal,
      }
    );
    t.done();
    if (!runRes.ok) return null;
    
    const runData: any = await runRes.json();
    const runId = runData?.data?.id;
    if (!runId) return null;
    
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statusRes.ok) break;
      const statusData: any = await statusRes.json();
      if (statusData?.data?.status === 'SUCCEEDED') {
        const datasetId = runData?.data?.defaultDatasetId;
        if (datasetId) {
          const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dataRes.ok) {
            const userData: any = await dataRes.json();
            if (Array.isArray(userData) && userData.length > 0) {
              const user = userData[0];
              return {
                title: safeString(user?.nickname) || cleanUsername,
                url: `https://www.tiktok.com/@${cleanUsername}`,
                snippet: safeString(user?.bio) || '',
                source: 'TikTok',
              };
            }
          }
        }
        break;
      } else if (statusData?.data?.status === 'FAILED' || statusData?.data?.status === 'ABORTED') {
        break;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOpenverseImages(q: string): Promise<ImageItem[]> {
  const url = `https://api.openverse.engineering/v1/images?q=${encodeURIComponent(q)}&page_size=24`;
  const t = withTimeout(8000);
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal });
  t.done();
  if (!res.ok) return [];
  const data: any = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((r: any) => ({
      url: safeString(r?.url) || safeString(r?.thumbnail) || '',
      title: safeString(r?.title) || safeString(r?.creator) || q,
      width: typeof r?.width === 'number' ? r.width : undefined,
      height: typeof r?.height === 'number' ? r.height : undefined,
      source: 'Openverse',
    }))
    .filter((x: ImageItem) => Boolean(x.url))
    .slice(0, 24);
}

async function fetchUnsplashImages(q: string, key: string): Promise<ImageItem[]> {
  const t = withTimeout(8000);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&client_id=${key}`,
    { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
  );
  t.done();
  if (!res.ok) return [];
  const data: any = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((img: any) => ({
      url: safeString(img?.urls?.regular) || '',
      title: safeString(img?.description) || safeString(img?.alt_description) || q,
      width: typeof img?.width === 'number' ? img.width : undefined,
      height: typeof img?.height === 'number' ? img.height : undefined,
      source: 'Unsplash',
    }))
    .filter((x: ImageItem) => Boolean(x.url))
    .slice(0, 24);
}

async function fetchApifyGoogleImages(q: string, token: string): Promise<ImageItem[]> {
  const t = withTimeout(15000);
  const res = await fetch(
    'https://api.apify.com/v2/acts/apify~google-image-scraper/run-sync-get-dataset-items',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: q, maxResults: 24 }),
      signal: t.signal,
    }
  );
  t.done();
  if (!res.ok) return [];
  const data: any = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => ({
      url: safeString(item?.url) || '',
      title: safeString(item?.title) || q,
      width: typeof item?.width === 'number' ? item.width : undefined,
      height: typeof item?.height === 'number' ? item.height : undefined,
      source: 'Google Images (Apify)',
    }))
    .filter((x: ImageItem) => Boolean(x.url))
    .slice(0, 24);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all').toLowerCase();

  if (!q) {
    return NextResponse.json({ query: q, web: [], images: [] });
  }

  const serpApiKey = process.env.SERP_API_KEY || '';
  const googleApiKey = process.env.GOOGLE_API_KEY || '';
  const googleEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  const apifyToken = process.env.APIFY_TOKEN || '';
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';

  try {
    // Always do regular web + image search first
    const wantsWeb = type === 'all' || type === 'web';
    const wantsImages = type === 'all' || type === 'images';

    // Get regular web and image results
    const [webDDG, webWiki, images] = await Promise.all([
      wantsWeb ? fetchDuckDuckGo(q) : Promise.resolve([]),
      wantsWeb ? fetchWikipedia(q) : Promise.resolve([]),
      wantsImages
        ? (async () => {
            // Image search: try free APIs first, then Apify
            if (apifyToken) {
              const apify = await fetchApifyGoogleImages(q, apifyToken);
              if (apify.length) return apify;
            }
            if (unsplashKey) {
              const unsplash = await fetchUnsplashImages(q, unsplashKey);
              if (unsplash.length) return unsplash;
            }
            return fetchOpenverseImages(q);
          })()
        : Promise.resolve([]),
    ]);

    // Merge regular web results
    const webAll = [...webDDG, ...webWiki];
    const seen = new Set<string>();
    const web: WebItem[] = [];
    for (const item of webAll) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      web.push(item);
      if (web.length >= 12) break;
    }

    // If type is 'social' or if query looks like a name/username, also search for social media profiles
    if (type === 'social' || (type === 'all' && q.length > 0)) {
      const socialResults: WebItem[] = [];
      
      // Priority 1: Apify for Instagram/TikTok (if username-like query) - like websearch folder
      const usernameMatch = q.match(/@?([a-zA-Z0-9._]+)/);
      if (apifyToken && usernameMatch) {
        const username = usernameMatch[1];
        const [instagram, tiktok] = await Promise.all([
          searchInstagramApify(username, apifyToken),
          searchTikTokApify(username, apifyToken),
        ]);
        if (instagram) socialResults.push(instagram);
        if (tiktok) socialResults.push(tiktok);
      }
      
      // Priority 2: SerpAPI (if available) - filter for real profiles
      if (serpApiKey && socialResults.length < 5) {
        const serpResults = await searchSocialMediaSerpAPI(q, serpApiKey);
        socialResults.push(...serpResults);
      }
      
      // Priority 3: Google Custom Search (if available) - filter for real profiles
      if (googleApiKey && googleEngineId && socialResults.length < 5) {
        const googleResults = await searchSocialMediaGoogle(q, googleApiKey, googleEngineId);
        socialResults.push(...googleResults);
      }
      
      // Priority 4: DuckDuckGo (free, filter for social media profiles)
      if (socialResults.length < 5) {
        const ddgResults = await searchSocialMediaDuckDuckGo(q);
        socialResults.push(...ddgResults);
      }
      
      // Dedupe by URL
      const seenSocial = new Set<string>();
      const uniqueSocial: WebItem[] = [];
      for (const item of socialResults) {
        if (!seenSocial.has(item.url)) {
          seenSocial.add(item.url);
          uniqueSocial.push(item);
        }
      }
      
      if (type === 'social') {
        return NextResponse.json({ query: q, web: uniqueSocial.slice(0, 20), images: [] });
      }
      
      // If type is 'all', merge social results with regular web results
      if (type === 'all' && uniqueSocial.length > 0) {
        // Add social results to the beginning of web results
        const mergedWeb = [...uniqueSocial, ...web];
        const seenMerged = new Set<string>();
        const finalWeb: WebItem[] = [];
        for (const item of mergedWeb) {
          if (!item.url || seenMerged.has(item.url)) continue;
          seenMerged.add(item.url);
          finalWeb.push(item);
          if (finalWeb.length >= 20) break;
        }
        return NextResponse.json({ query: q, web: finalWeb, images });
      }
    }

    // If we reach here, it's a regular web/image search (not 'social' type)
    return NextResponse.json({ query: q, web, images });
  } catch (e: any) {
    return NextResponse.json(
      { query: q, web: [], images: [], error: e?.message || 'Search failed' },
      { status: 500 }
    );
  }
}
