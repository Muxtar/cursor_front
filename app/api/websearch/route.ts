import { NextResponse } from 'next/server';

// OSINT Result Types
type OSINTResult = {
  platform: string;
  link: string;
  confidenceScore: number; // 0-100
  description: string;
  matchReason: string;
  activeStatus?: string;
  source: string; // Serper / PDL / Clearbit
  notes?: string;
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
    missingInfo?: string[];
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

type ProfileMatch = {
  url: string;
  platform: string;
  title: string;
  snippet: string;
  source: string;
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
  
  // Username pattern: @username or alphanumeric with dots/underscores, single word (no spaces)
  if (trimmed.startsWith('@') || (/^[a-zA-Z0-9._]+$/.test(trimmed) && !trimmed.includes(' '))) {
    return 'username';
  }
  
  // Name pattern: Two or more words (assume it's a person name)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    // If it has 2+ words and doesn't look like a URL or special pattern, treat as name
    // Exclude URLs and email-like patterns
    if (!trimmed.includes('http') && !trimmed.includes('@') && !trimmed.match(/^[a-z]+:\/\//i)) {
      return 'name';
    }
  }
  
  // Single word - could be name or image keyword, default to name for people search
  if (words.length === 1 && words[0].length > 2) {
    return 'name';
  }
  
  // Image keyword: everything else
  return 'image';
}

// Extract estimated country, language, profession from name (basic heuristics)
function extractMetadata(name: string): { country?: string; language?: string; profession?: string } {
  // This is a placeholder - in real OSINT, you'd use more sophisticated methods
  // For now, return empty as we don't have reliable data sources
  return {};
}

// Search using Serper API (Google Search alternative)
async function searchWithSerper(
  query: string,
  apiKey: string
): Promise<ProfileMatch[]> {
  const results: ProfileMatch[] = [];
  
  try {
    const t = withTimeout(15000);
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 20 }),
      signal: t.signal,
    });
    t.done();
    
    if (!res.ok) return results;
    
    const data: any = await res.json();
    
    // Process organic results
    if (Array.isArray(data?.organic)) {
      for (const item of data.organic) {
        const link = safeString(item?.link);
        const title = safeString(item?.title);
        const snippet = safeString(item?.snippet);
        
        // Check if it's a Facebook, LinkedIn, or Twitter profile
        if (link && (link.includes('facebook.com') || link.includes('linkedin.com') || link.includes('twitter.com') || link.includes('x.com'))) {
          // Exclude search pages and non-profile pages
          if (!link.includes('/search') && !link.includes('/hashtag/') && !link.includes('/pages/')) {
            let platform = 'Unknown';
            if (link.includes('facebook.com')) platform = 'Facebook';
            else if (link.includes('linkedin.com')) platform = 'LinkedIn';
            else if (link.includes('twitter.com') || link.includes('x.com')) platform = 'X (Twitter)';
            
            results.push({
              url: link,
              platform,
              title: title || link,
              snippet: snippet || '',
              source: 'Serper',
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Serper API error:', e);
  }
  
  return results;
}

// Search People Data Labs
async function searchPDL(
  name: string,
  apiKey: string,
  location?: string
): Promise<ProfileMatch[]> {
  const results: ProfileMatch[] = [];
  
  try {
    const t = withTimeout(15000);
    const params: any = {
      full_name: name,
    };
    if (location) {
      params.location = location;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`https://api.peopledatalabs.com/v5/person/search?${queryString}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: t.signal,
    });
    t.done();
    
    if (!res.ok) return results;
    
    const data: any = await res.json();
    
    // Process PDL results
    if (Array.isArray(data?.data)) {
      for (const person of data.data) {
        const confidence = typeof person?.confidence === 'number' ? person.confidence : 0;
        
        // Only include if confidence is reasonable
        if (confidence >= 40) {
          const profiles = person?.profiles || [];
          
          for (const profile of profiles) {
            const url = safeString(profile?.url);
            const platform = safeString(profile?.network);
            
            if (url && (platform === 'facebook' || platform === 'linkedin' || platform === 'twitter')) {
              let platformName = 'Unknown';
              if (platform === 'facebook') platformName = 'Facebook';
              else if (platform === 'linkedin') platformName = 'LinkedIn';
              else if (platform === 'twitter') platformName = 'X (Twitter)';
              
              results.push({
                url,
                platform: platformName,
                title: `${name} - ${safeString(person?.job_title) || 'Professional'}`,
                snippet: `${safeString(person?.summary) || ''} Confidence: ${confidence}%`,
                source: 'PDL',
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('PDL API error:', e);
  }
  
  return results;
}

// Search Clearbit (professional matching)
async function searchClearbit(
  name: string,
  apiKey: string,
  domain?: string
): Promise<ProfileMatch[]> {
  const results: ProfileMatch[] = [];
  
  try {
    // Clearbit Person Enrichment API
    const t = withTimeout(15000);
    const params: any = { name };
    if (domain) {
      params.domain = domain;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`https://person.clearbit.com/v2/combined/find?${queryString}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: t.signal,
    });
    t.done();
    
    if (!res.ok) return results;
    
    const data: any = await res.json();
    
    // Process Clearbit results
    const person = data?.person;
    if (person) {
      const linkedin = safeString(person?.linkedin?.handle);
      const twitter = safeString(person?.twitter?.handle);
      
      if (linkedin) {
        results.push({
          url: `https://www.linkedin.com/in/${linkedin}`,
          platform: 'LinkedIn',
          title: `${name} - ${safeString(person?.title) || 'Professional'}`,
          snippet: safeString(person?.bio) || safeString(person?.summary) || '',
          source: 'Clearbit',
        });
      }
      
      if (twitter) {
        results.push({
          url: `https://twitter.com/${twitter}`,
          platform: 'X (Twitter)',
          title: `${name} - ${safeString(person?.title) || 'Professional'}`,
          snippet: safeString(person?.bio) || safeString(person?.summary) || '',
          source: 'Clearbit',
        });
      }
    }
  } catch (e) {
    console.error('Clearbit API error:', e);
  }
  
  return results;
}

// Fallback search using DuckDuckGo (free, no API key required)
async function searchWithDuckDuckGo(query: string): Promise<ProfileMatch[]> {
  const results: ProfileMatch[] = [];
  
  try {
    const t = withTimeout(10000);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&t=websearch`,
      { headers: { 'User-Agent': 'websearch/1.0' }, signal: t.signal }
    );
    t.done();
    
    if (!res.ok) return results;
    
    const data: any = await res.json();
    const rt = data?.RelatedTopics;
    
    if (Array.isArray(rt)) {
      for (const entry of rt) {
        const topics = entry?.Topics || [entry];
        for (const topic of topics) {
          const text = safeString(topic?.Text);
          const url = safeString(topic?.FirstURL);
          
          // Check if it's a Facebook, LinkedIn, or Twitter profile
          if (url && (url.includes('facebook.com') || url.includes('linkedin.com') || url.includes('twitter.com') || url.includes('x.com'))) {
            // Exclude search pages
            if (!url.includes('/search') && !url.includes('/hashtag/') && !url.includes('/pages/')) {
              let platform = 'Unknown';
              if (url.includes('facebook.com')) platform = 'Facebook';
              else if (url.includes('linkedin.com')) platform = 'LinkedIn';
              else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'X (Twitter)';
              
              results.push({
                url,
                platform,
                title: text.split(' - ')[0] || text,
                snippet: text,
                source: 'DuckDuckGo',
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('DuckDuckGo search error:', e);
  }
  
  return results;
}

// Fallback search using SerpAPI (if available, different from Serper)
async function searchWithSerpAPI(query: string, apiKey: string): Promise<ProfileMatch[]> {
  const results: ProfileMatch[] = [];
  
  try {
    const t = withTimeout(10000);
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}`,
      { signal: t.signal }
    );
    t.done();
    
    if (!res.ok) return results;
    
    const data: any = await res.json();
    
    // Process organic results
    if (Array.isArray(data?.organic_results)) {
      for (const item of data.organic_results) {
        const link = safeString(item?.link);
        const title = safeString(item?.title);
        const snippet = safeString(item?.snippet);
        
        // Check if it's a Facebook, LinkedIn, or Twitter profile
        if (link && (link.includes('facebook.com') || link.includes('linkedin.com') || link.includes('twitter.com') || link.includes('x.com'))) {
          // Exclude search pages
          if (!link.includes('/search') && !link.includes('/hashtag/') && !link.includes('/pages/')) {
            let platform = 'Unknown';
            if (link.includes('facebook.com')) platform = 'Facebook';
            else if (link.includes('linkedin.com')) platform = 'LinkedIn';
            else if (link.includes('twitter.com') || link.includes('x.com')) platform = 'X (Twitter)';
            
            results.push({
              url: link,
              platform,
              title: title || link,
              snippet: snippet || '',
              source: 'SerpAPI',
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('SerpAPI error:', e);
  }
  
  return results;
}

// Search for person by name - OSINT People Search
async function searchPersonByNameOSINT(
  name: string,
  serperKey: string,
  pdlKey: string,
  clearbitKey: string,
  serpApiKey: string
): Promise<OSINTResult[]> {
  const allMatches: ProfileMatch[] = [];
  const metadata = extractMetadata(name);
  
  // 1. Google-style search with Serper (if available)
  const serperQueries = [
    `site:facebook.com "${name}"`,
    `site:linkedin.com/in "${name}"`,
    `site:twitter.com "${name}"`,
    `site:x.com "${name}"`,
  ];
  
  let hasSerperResults = false;
  for (const query of serperQueries) {
    if (serperKey) {
      const serperResults = await searchWithSerper(query, serperKey);
      if (serperResults.length > 0) hasSerperResults = true;
      allMatches.push(...serperResults);
    }
  }
  
  // 2. Fallback: SerpAPI (if available and Serper didn't work)
  if (!hasSerperResults && serpApiKey) {
    for (const query of serperQueries) {
      const serpResults = await searchWithSerpAPI(query, serpApiKey);
      allMatches.push(...serpResults);
    }
  }
  
  // 3. Fallback: DuckDuckGo (free, always available as backup)
  // Always try DuckDuckGo even if other APIs worked, to get more results
  const fallbackQueries = [
    `"${name}" facebook`,
    `"${name}" linkedin`,
    `"${name}" twitter`,
    `"${name}" site:facebook.com`,
    `"${name}" site:linkedin.com`,
  ];
  
  for (const query of fallbackQueries) {
    const ddgResults = await searchWithDuckDuckGo(query);
    allMatches.push(...ddgResults);
  }
  
  // 4. People Data Labs verification (if available)
  if (pdlKey) {
    const pdlResults = await searchPDL(name, pdlKey, metadata.country);
    allMatches.push(...pdlResults);
  }
  
  // 5. Clearbit professional matching (if available)
  if (clearbitKey) {
    const clearbitResults = await searchClearbit(name, clearbitKey, metadata.profession ? undefined : undefined);
    allMatches.push(...clearbitResults);
  }
  
  // 4. Merge and score results
  const urlMap = new Map<string, {
    matches: ProfileMatch[];
    platform: string;
    url: string;
  }>();
  
  for (const match of allMatches) {
    const key = match.url.toLowerCase();
    if (!urlMap.has(key)) {
      urlMap.set(key, {
        matches: [],
        platform: match.platform,
        url: match.url,
      });
    }
    urlMap.get(key)!.matches.push(match);
  }
  
  // 5. Convert to OSINT results with scoring
  const results: OSINTResult[] = [];
  
  for (const [url, data] of urlMap.entries()) {
    const matches = data.matches;
    const sourceCount = new Set(matches.map(m => m.source)).size;
    
    // Calculate confidence score
    let confidence = 40; // Base score
    if (sourceCount >= 3) confidence = 90;
    else if (sourceCount === 2) confidence = 75;
    else confidence = 50;
    
    // Boost confidence if PDL or Clearbit found it
    if (matches.some(m => m.source === 'PDL')) confidence = Math.min(100, confidence + 15);
    if (matches.some(m => m.source === 'Clearbit')) confidence = Math.min(100, confidence + 10);
    
    // Get best description
    const bestMatch = matches.find(m => m.snippet) || matches[0];
    const sources = [...new Set(matches.map(m => m.source))].join(' / ');
    
    // Match reason
    let matchReason = '';
    if (sourceCount >= 3) {
      matchReason = `Found in ${sourceCount} sources (${sources})`;
    } else if (sourceCount === 2) {
      matchReason = `Found in 2 sources (${sources})`;
    } else {
      matchReason = `Found via ${sources}`;
    }
    
    // Check for potential false matches
    const warnings: string[] = [];
    if (confidence < 60) {
      warnings.push('Low confidence - may be a different person with the same name');
    }
    if (!bestMatch.snippet || bestMatch.snippet.length < 20) {
      warnings.push('Limited profile information available');
    }
    
    results.push({
      platform: data.platform,
      link: data.url,
      confidenceScore: confidence,
      description: bestMatch.snippet || bestMatch.title || '',
      matchReason,
      activeStatus: confidence > 70 ? 'Likely active' : 'Uncertain',
      source: sources,
      notes: bestMatch.title,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }
  
  // Sort by confidence score (highest first)
  results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  
  return results.slice(0, 20); // Limit to top 20
}

// Search for username across platforms (keep existing logic but simplified)
async function searchUsername(
  username: string,
  serperKey: string,
  pdlKey: string,
  clearbitKey: string
): Promise<OSINTResult[]> {
  const results: OSINTResult[] = [];
  const cleanUsername = username.replace(/^@/, '').trim();
  
  const platforms = [
    { name: 'Facebook', url: `https://www.facebook.com/${cleanUsername}` },
    { name: 'X (Twitter)', url: `https://x.com/${cleanUsername}` },
    { name: 'LinkedIn', url: `https://www.linkedin.com/in/${cleanUsername}` },
  ];
  
  // Check each platform with Serper if available
  for (const platform of platforms) {
    if (serperKey) {
      try {
        const query = `site:${platform.url.split('//')[1].split('/')[0]} "${cleanUsername}"`;
        const serperResults = await searchWithSerper(query, serperKey);
        if (serperResults.length > 0) {
          const match = serperResults[0];
          results.push({
            platform: platform.name,
            link: platform.url,
            confidenceScore: 70,
            description: match.snippet || 'Account found',
            matchReason: 'Found via Serper search',
            activeStatus: 'Likely active',
            source: 'Serper',
          });
        } else {
          results.push({
            platform: platform.name,
            link: platform.url,
            confidenceScore: 30,
            description: 'Account existence could not be verified',
            matchReason: 'Created based on platform URL format',
            activeStatus: 'Not verified',
            source: 'Estimated',
            warnings: ['Account verification failed'],
          });
        }
      } catch (e) {
        // Continue
      }
    } else {
      // No API, just create URL
      results.push({
        platform: platform.name,
        link: platform.url,
        confidenceScore: 25,
        description: 'Account could not be checked',
        matchReason: 'Created based on platform URL format',
        activeStatus: 'Unknown',
        source: 'Estimated',
        warnings: ['Account check failed - no API available'],
      });
    }
  }
  
  return results;
}

// Search images using free APIs (keep existing)
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

  // OSINT People Search API Keys
  const serperKey = process.env.SERPER_API_KEY || '';
  const pdlKey = process.env.PDL_API_KEY || '';
  const clearbitKey = process.env.CLEARBIT_API_KEY || '';
  
  // Fallback APIs (for image search and username search)
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
      missingInfo: [] as string[],
    };
    let warnings: string[] = [];

    if (inputType === 'name') {
      // OSINT People Search - Focus on Facebook, LinkedIn, Twitter
      results = await searchPersonByNameOSINT(q, serperKey, pdlKey, clearbitKey, serpApiKey);
      
      // Analysis
      const highConfidence = results.filter(r => r.confidenceScore >= 70).length;
      const mediumConfidence = results.filter(r => r.confidenceScore >= 50 && r.confidenceScore < 70).length;
      const lowConfidence = results.filter(r => r.confidenceScore < 50).length;
      
      analysis = {
        matchReason: `OSINT search performed for "${q}" across Facebook, LinkedIn, and X (Twitter). Profiles found from multiple sources (Serper, PDL, Clearbit) are scored and ranked by confidence.`,
        possibleFalseMatches: results
          .filter((r) => r.confidenceScore < 60)
          .map((r) => `${r.platform}: ${r.link} (${r.confidenceScore}% confidence)`),
        dataReliability: results.length > 0
          ? highConfidence > 0
            ? `High - ${highConfidence} profiles with high confidence (70%+)`
            : mediumConfidence > 0
            ? `Medium - ${mediumConfidence} profiles with medium confidence (50-69%)`
            : `Low - ${lowConfidence} profiles with low confidence (<50%)`
          : 'Low - No profiles found',
        missingInfo: [
          ...(results.length === 0 ? ['No profiles found - person may not have public profiles'] : []),
          ...(results.some(r => !r.description || r.description.length < 20) ? ['Limited profile information available'] : []),
        ],
      };
      
      warnings = [
        ...(results.length === 0 ? ['No profiles found. The person may not have public social media profiles, or the name may be misspelled.'] : []),
        ...(lowConfidence > 0 ? [`${lowConfidence} profiles have low confidence scores - may be different people with the same name.`] : []),
        'There may be different people with the same name. Please verify results manually.',
        ...(serperKey ? [] : serpApiKey ? [] : ['Using free search methods (DuckDuckGo) - results may be limited. For better results, configure SERPER_API_KEY or SERP_API_KEY.']),
        ...(pdlKey ? [] : ['PDL API key not configured - People Data Labs verification unavailable (optional)']),
        ...(clearbitKey ? [] : ['Clearbit API key not configured - professional matching unavailable (optional)']),
      ];
    } else if (inputType === 'username') {
      // Search for username across platforms
      results = await searchUsername(q, serperKey, pdlKey, clearbitKey);
      analysis = {
        matchReason: `Username "${q}" checked across Facebook, LinkedIn, and X (Twitter). Possible accounts listed based on platform URL formats and API verification.`,
        possibleFalseMatches: results
          .filter((r) => r.confidenceScore < 50)
          .map((r) => `${r.platform}: Account existence could not be verified`),
        dataReliability: results.some((r) => r.confidenceScore > 70)
          ? 'Medium-High - Some accounts verified'
          : 'Low-Medium - Most accounts could not be verified, created based on URL format',
        missingInfo: ['Account verification requires API access'],
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
        missingInfo: [],
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
      // Only include images if input type is 'image'
      ...(inputType === 'image' ? { images } : {}),
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
          missingInfo: [],
        },
        warnings: [`Search error: ${e?.message || 'Unknown error'}`],
        images: [],
      } as OSINTResponse,
      { status: 500 }
    );
  }
}
