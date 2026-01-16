import { NextResponse } from 'next/server';

// OSINT Result Types
type OSINTResult = {
  platform: string;
  link: string;
  confidenceScore: number; // 0-100
  description: string;
  matchReason: string;
  activeStatus?: string;
  warnings?: string[];
};

type OSINTResponse = {
  query: string;
  inputType: 'name' | 'username' | 'image' | 'unknown';
  results: OSINTResult[];
  analysis: {
    matchReason: string;
    possibleFalseMatches: string[];
    dataReliability: string;
  };
  warnings: string[];
  images?: ImageItem[];
};

type ImageItem = {
  url: string;
  title?: string;
  width?: number;
  height?: number;
  source: string;
  license?: string;
  context?: string;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function safeString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

// Detect input type automatically
function detectInputType(query: string): 'name' | 'username' | 'image' | 'unknown' {
  const trimmed = query.trim();
  
  // Username pattern: @username or alphanumeric with dots/underscores, single word
  if (trimmed.startsWith('@') || /^[a-zA-Z0-9._]+$/.test(trimmed) && !trimmed.includes(' ')) {
    return 'username';
  }
  
  // Name pattern: Two or more words, likely starts with capital letters
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.every(w => w.length > 0)) {
    // Check if it looks like a name (at least first word starts with capital)
    if (words[0][0] === words[0][0].toUpperCase() || words.some(w => w[0] === w[0].toUpperCase())) {
      return 'name';
    }
  }
  
  // Image keyword: everything else
  return 'image';
}

// Check if URL is a social media profile
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
    'twitch.tv',
    'medium.com',
    'vk.com',
    'telegram.org',
  ];
  
  const excludePaths = ['/search', '/results', '/top/', '/people/', '/pages/', '/hashtag/'];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    const isSocialDomain = socialDomains.some((domain) => hostname.includes(domain));
    if (!isSocialDomain) return false;
    
    const isSearchPage = excludePaths.some((path) => pathname.includes(path));
    if (isSearchPage) return false;
    
    if (pathname === '/' || pathname === '') return false;
    
    return pathname.length > 1;
  } catch {
    return false;
  }
}

function getPlatformName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'X (Twitter)';
    if (hostname.includes('facebook')) return 'Facebook';
    if (hostname.includes('tiktok')) return 'TikTok';
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('pinterest')) return 'Pinterest';
    if (hostname.includes('snapchat')) return 'Snapchat';
    if (hostname.includes('reddit')) return 'Reddit';
    if (hostname.includes('github')) return 'GitHub';
    if (hostname.includes('twitch')) return 'Twitch';
    if (hostname.includes('medium')) return 'Medium';
    if (hostname.includes('vk.com')) return 'VKontakte';
    if (hostname.includes('telegram')) return 'Telegram';
    return 'Social Media';
  } catch {
    return 'Social Media';
  }
}

// Calculate confidence score based on various factors
function calculateConfidenceScore(
  url: string,
  title: string,
  snippet: string,
  query: string
): number {
  let score = 50; // Base score
  
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const snippetLower = snippet.toLowerCase();
  
  // Exact match in title
  if (titleLower.includes(queryLower)) score += 20;
  
  // Exact match in snippet
  if (snippetLower.includes(queryLower)) score += 10;
  
  // URL contains query
  if (url.toLowerCase().includes(queryLower.replace(/\s+/g, ''))) score += 15;
  
  // Has meaningful snippet
  if (snippet && snippet.length > 20) score += 5;
  
  // Social media profile (more reliable)
  if (isSocialMediaUrl(url)) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

// Search for person by name across platforms
async function searchPersonByName(
  name: string,
  serpApiKey: string,
  googleApiKey: string,
  googleEngineId: string,
  apifyToken: string
): Promise<OSINTResult[]> {
  const results: OSINTResult[] = [];
  const platforms = [
    'Instagram',
    'X (Twitter)',
    'LinkedIn',
    'Facebook',
    'TikTok',
    'YouTube',
    'GitHub',
    'Medium',
  ];
  
  // Build search queries
  const searchQueries = [
    `"${name}"`,
    `${name} Instagram`,
    `${name} Twitter`,
    `${name} LinkedIn`,
    `${name} Facebook`,
    `${name} TikTok`,
    `${name} YouTube`,
    `${name} GitHub`,
    `${name} site:medium.com`,
  ];
  
  const allResults: Array<{ url: string; title: string; snippet: string; source: string }> = [];
  
  // Search using available APIs
  for (const query of searchQueries.slice(0, 3)) { // Limit to avoid rate limits
    try {
      // Try SerpAPI first
      if (serpApiKey) {
        const t = withTimeout(10000);
        const res = await fetch(
          `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(serpApiKey)}`,
          { signal: t.signal }
        );
        t.done();
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data?.organic_results)) {
            for (const item of data.organic_results) {
              const link = safeString(item?.link);
              if (link && isSocialMediaUrl(link)) {
                allResults.push({
                  url: link,
                  title: safeString(item?.title) || link,
                  snippet: safeString(item?.snippet) || '',
                  source: getPlatformName(link),
                });
              }
            }
          }
        }
      }
      
      // Try Google Custom Search
      if (googleApiKey && googleEngineId && allResults.length < 10) {
        const t = withTimeout(10000);
        const res = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleApiKey)}&cx=${encodeURIComponent(googleEngineId)}&q=${encodeURIComponent(query)}`,
          { signal: t.signal }
        );
        t.done();
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data?.items)) {
            for (const item of data.items) {
              const link = safeString(item?.link);
              if (link && isSocialMediaUrl(link)) {
                allResults.push({
                  url: link,
                  title: safeString(item?.title) || link,
                  snippet: safeString(item?.snippet) || '',
                  source: getPlatformName(link),
                });
              }
            }
          }
        }
      }
      
      // Try DuckDuckGo (free fallback)
      if (allResults.length < 10) {
        const t = withTimeout(8000);
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&t=websearch`,
          { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
        );
        t.done();
        if (res.ok) {
          const data: any = await res.json();
          const rt = data?.RelatedTopics;
          if (Array.isArray(rt)) {
            for (const entry of rt) {
              const topics = entry?.Topics || [entry];
              for (const topic of topics) {
                const text = safeString(topic?.Text);
                const url = safeString(topic?.FirstURL);
                if (url && isSocialMediaUrl(url)) {
                  allResults.push({
                    url,
                    title: text.split(' - ')[0] || text,
                    snippet: text,
                    source: getPlatformName(url),
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Continue with next query
      continue;
    }
  }
  
  // Convert to OSINT results
  const seen = new Set<string>();
  for (const item of allResults) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    
    const confidence = calculateConfidenceScore(item.url, item.title, item.snippet, name);
    const matchReason = item.snippet.includes(name)
      ? 'Name appears in snippet'
      : item.title.includes(name)
      ? 'Name appears in title'
      : 'URL or platform match';
    
    results.push({
      platform: item.source,
      link: item.url,
      confidenceScore: confidence,
      description: item.snippet || item.title,
      matchReason,
      activeStatus: confidence > 70 ? 'Likely active' : 'Uncertain',
    });
  }
  
  return results.slice(0, 20);
}

// Search for username across platforms
async function searchUsername(
  username: string,
  serpApiKey: string,
  googleApiKey: string,
  googleEngineId: string,
  apifyToken: string
): Promise<OSINTResult[]> {
  const results: OSINTResult[] = [];
  const cleanUsername = username.replace(/^@/, '').trim();
  
  const platforms = [
    { name: 'Instagram', url: `https://www.instagram.com/${cleanUsername}/` },
    { name: 'X (Twitter)', url: `https://x.com/${cleanUsername}` },
    { name: 'TikTok', url: `https://www.tiktok.com/@${cleanUsername}` },
    { name: 'GitHub', url: `https://github.com/${cleanUsername}` },
    { name: 'Reddit', url: `https://www.reddit.com/user/${cleanUsername}` },
    { name: 'Twitch', url: `https://www.twitch.tv/${cleanUsername}` },
    { name: 'Pinterest', url: `https://www.pinterest.com/${cleanUsername}/` },
  ];
  
  // Check each platform
  for (const platform of platforms) {
    try {
      // Try to verify if account exists using search
      const searchQuery = `${cleanUsername} ${platform.name}`;
      let found = false;
      let snippet = '';
      
      if (serpApiKey) {
        const t = withTimeout(8000);
        const res = await fetch(
          `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${encodeURIComponent(serpApiKey)}`,
          { signal: t.signal }
        );
        t.done();
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data?.organic_results)) {
            for (const item of data.organic_results) {
              if (safeString(item?.link).includes(platform.url.replace('https://', '').split('/')[0])) {
                found = true;
                snippet = safeString(item?.snippet) || '';
                break;
              }
            }
          }
        }
      }
      
      // If not found via API, still add with lower confidence
      const confidence = found ? 75 : 30; // Lower confidence if not verified
      
      results.push({
        platform: platform.name,
        link: platform.url,
        confidenceScore: confidence,
        description: found ? snippet : 'Account existence could not be verified',
        matchReason: found ? 'Found in platform search' : 'Created based on platform URL format',
        activeStatus: found ? 'Likely active' : 'Not verified',
        warnings: found ? undefined : ['Account existence could not be verified via API'],
      });
    } catch (e) {
      // Add with low confidence if check fails
      results.push({
        platform: platform.name,
        link: platform.url,
        confidenceScore: 25,
        description: 'Account could not be checked',
        matchReason: 'Created based on platform URL format',
        activeStatus: 'Unknown',
        warnings: ['Account check failed'],
      });
    }
  }
  
  // Also try Apify for Instagram/TikTok if available
  if (apifyToken) {
    try {
      // Instagram
      const t = withTimeout(30000);
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apifyToken}`,
          },
          body: JSON.stringify({
            startUrls: [{ url: `https://www.instagram.com/${cleanUsername}/` }],
          }),
          signal: t.signal,
        }
      );
      t.done();
      if (runRes.ok) {
        const runData: any = await runRes.json();
        const runId = runData?.data?.id;
        if (runId) {
          // Wait briefly for completion
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
            headers: { Authorization: `Bearer ${apifyToken}` },
          });
          if (statusRes.ok) {
            const statusData: any = await statusRes.json();
            if (statusData?.data?.status === 'SUCCEEDED') {
              const datasetId = runData?.data?.defaultDatasetId;
              if (datasetId) {
                const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
                  headers: { Authorization: `Bearer ${apifyToken}` },
                });
                if (dataRes.ok) {
                  const profileData: any = await dataRes.json();
                  if (Array.isArray(profileData) && profileData.length > 0) {
                    const profile = profileData[0];
                    // Update Instagram result
                    const instagramIdx = results.findIndex((r) => r.platform === 'Instagram');
                    if (instagramIdx >= 0) {
                      results[instagramIdx] = {
                        platform: 'Instagram',
                        link: `https://www.instagram.com/${cleanUsername}/`,
                        confidenceScore: 95,
                        description: safeString(profile?.biography) || safeString(profile?.fullName) || '',
                        matchReason: 'Verified via Apify API',
                        activeStatus: 'Active',
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Continue without Apify results
    }
  }
  
  return results;
}

// Search images using free APIs
async function searchImages(
  query: string,
  unsplashKey: string,
  pexelsKey: string,
  pixabayKey: string
): Promise<ImageItem[]> {
  const results: ImageItem[] = [];
  
  // Try Unsplash
  if (unsplashKey) {
    try {
      const t = withTimeout(8000);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=${unsplashKey}`,
        { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
      );
      t.done();
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data?.results)) {
          for (const img of data.results) {
            results.push({
              url: safeString(img?.urls?.regular) || '',
              title: safeString(img?.description) || safeString(img?.alt_description) || query,
              width: typeof img?.width === 'number' ? img.width : undefined,
              height: typeof img?.height === 'number' ? img.height : undefined,
              source: 'Unsplash',
              license: 'Unsplash License (Free)',
              context: safeString(img?.description) || safeString(img?.alt_description),
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Try Pexels
  if (pexelsKey && results.length < 12) {
    try {
      const t = withTimeout(8000);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
        {
          headers: {
            Authorization: pexelsKey,
            'User-Agent': 'websearch/1.0',
          },
          signal: t.signal,
        }
      );
      t.done();
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data?.photos)) {
          for (const img of data.photos) {
            results.push({
              url: safeString(img?.src?.large) || safeString(img?.src?.medium) || '',
              title: safeString(img?.alt) || query,
              width: typeof img?.width === 'number' ? img.width : undefined,
              height: typeof img?.height === 'number' ? img.height : undefined,
              source: 'Pexels',
              license: 'Pexels License (Free)',
              context: safeString(img?.alt),
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Try Pixabay
  if (pixabayKey && results.length < 12) {
    try {
      const t = withTimeout(8000);
      const res = await fetch(
        `https://pixabay.com/api/?key=${encodeURIComponent(pixabayKey)}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12`,
        { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
      );
      t.done();
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data?.hits)) {
          for (const img of data.hits) {
            results.push({
              url: safeString(img?.webformatURL) || safeString(img?.largeImageURL) || '',
              title: safeString(img?.tags) || query,
              width: typeof img?.imageWidth === 'number' ? img.imageWidth : undefined,
              height: typeof img?.imageHeight === 'number' ? img.imageHeight : undefined,
              source: 'Pixabay',
              license: 'Pixabay License (Free)',
              context: safeString(img?.tags),
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Try Openverse (free, no key required)
  if (results.length < 12) {
    try {
      const t = withTimeout(8000);
      const res = await fetch(
        `https://api.openverse.engineering/v1/images?q=${encodeURIComponent(query)}&page_size=12`,
        { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
      );
      t.done();
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data?.results)) {
          for (const r of data.results) {
            results.push({
              url: safeString(r?.url) || safeString(r?.thumbnail) || '',
              title: safeString(r?.title) || safeString(r?.creator) || query,
              width: typeof r?.width === 'number' ? r.width : undefined,
              height: typeof r?.height === 'number' ? r.height : undefined,
              source: 'Openverse',
              license: safeString(r?.license) || 'Unknown',
              context: safeString(r?.title) || safeString(r?.creator),
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  return results.slice(0, 24);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({
      query: q,
      inputType: 'unknown',
      results: [],
      analysis: {
        matchReason: '',
        possibleFalseMatches: [],
        dataReliability: '',
      },
      warnings: [],
      images: [],
    } as OSINTResponse);
  }

  const serpApiKey = process.env.SERP_API_KEY || '';
  const googleApiKey = process.env.GOOGLE_API_KEY || '';
  const googleEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  const apifyToken = process.env.APIFY_TOKEN || '';
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';
  const pexelsKey = process.env.PEXELS_API_KEY || '';
  const pixabayKey = process.env.PIXABAY_API_KEY || '';

  try {
    // Auto-detect input type
    const inputType = detectInputType(q);
    
    let results: OSINTResult[] = [];
    let images: ImageItem[] = [];
    let analysis = {
      matchReason: '',
      possibleFalseMatches: [] as string[],
      dataReliability: '',
    };
    let warnings: string[] = [];

    if (inputType === 'name') {
      // Search for person by name
      results = await searchPersonByName(q, serpApiKey, googleApiKey, googleEngineId, apifyToken);
      analysis = {
        matchReason: `Search performed across social media platforms for "${q}". Found accounts are listed with match reasons.`,
        possibleFalseMatches: results
          .filter((r) => r.confidenceScore < 60)
          .map((r) => `${r.platform}: ${r.link}`),
        dataReliability: results.length > 0
          ? results.some((r) => r.confidenceScore > 70)
            ? 'High - Some results have high confidence scores'
            : 'Medium - Results have low-medium confidence scores'
          : 'Low - No results found',
      };
      warnings = [
        ...(results.length === 0 ? ['No results found. There may be different people with the same name.'] : []),
        ...(results.some((r) => r.confidenceScore < 50)
          ? ['Some results have low confidence scores. These may be fake/fan accounts.']
          : []),
        'There may be different people with the same name. Please verify results manually.',
      ];
    } else if (inputType === 'username') {
      // Search for username across platforms
      results = await searchUsername(q, serpApiKey, googleApiKey, googleEngineId, apifyToken);
      analysis = {
        matchReason: `Username "${q}" checked across different platforms. Possible accounts listed based on platform URL formats.`,
        possibleFalseMatches: results
          .filter((r) => r.confidenceScore < 50)
          .map((r) => `${r.platform}: Account existence could not be verified`),
        dataReliability: results.some((r) => r.confidenceScore > 70)
          ? 'Medium-High - Some accounts verified'
          : 'Low-Medium - Most accounts could not be verified, created based on URL format',
      };
      warnings = [
        'Account existence could not be fully verified via API. Manual verification recommended.',
        'The same username may be used by different people.',
        'Account verification could not be performed for some platforms.',
      ];
    } else {
      // Image keyword search
      images = await searchImages(q, unsplashKey, pexelsKey, pixabayKey);
      analysis = {
        matchReason: `Search performed in free image sources for "${q}" image keyword.`,
        possibleFalseMatches: [],
        dataReliability: images.length > 0
          ? 'High - Free and open source images'
          : 'Low - No results found',
      };
      warnings = [
        ...(images.length === 0 ? ['No image results found.'] : []),
        'License status indicated according to sources.',
        'Use the image upload feature for reverse image search.',
      ];
    }

    const response: OSINTResponse = {
      query: q,
      inputType,
      results,
      analysis,
      warnings: [...new Set(warnings)], // Remove duplicates
      ...(images.length > 0 ? { images } : {}),
    };

    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json(
      {
        query: q,
        inputType: 'unknown',
        results: [],
        analysis: {
          matchReason: '',
          possibleFalseMatches: [],
          dataReliability: 'Error occurred',
        },
        warnings: [`Search error: ${e?.message || 'Unknown error'}`],
        images: [],
      } as OSINTResponse,
      { status: 500 }
    );
  }
}
