import { NextResponse } from 'next/server';

type WebItem = { title: string; url: string; snippet?: string; source: string };
type ImageItem = { url: string; title?: string; width?: number; height?: number; source: string };

function safeString(v: unknown) {
  return typeof v === 'string' ? v : '';
}

async function fetchDuckDuckGo(q: string): Promise<WebItem[]> {
  // DuckDuckGo Instant Answer API (no key). Some topics might be nested.
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&t=websearch`;
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' } });
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
  // Wikipedia OpenSearch (no key, CORS-friendly server-side)
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=10&namespace=0&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' } });
  if (!res.ok) return [];
  const data: any = await res.json();
  // [query, titles[], descriptions[], urls[]]
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

async function fetchOpenverseImages(q: string): Promise<ImageItem[]> {
  // Openverse images (no key)
  const url = `https://api.openverse.engineering/v1/images?q=${encodeURIComponent(q)}&page_size=24`;
  const res = await fetch(url, { headers: { 'User-Agent': 'websearch/1.0' } });
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
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&client_id=${key}`,
    { headers: { 'User-Agent': 'websearch/1.0' } }
  );
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
  const res = await fetch(
    'https://api.apify.com/v2/acts/apify~google-image-scraper/run-sync-get-dataset-items',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: q, maxResults: 24 }),
    }
  );
  if (!res.ok) return [];
  const data: any = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => ({
      url: safeString(item?.url) || '',
      title: safeString(item?.title) || q,
      width: typeof item?.width === 'number' ? item.width : undefined,
      height: typeof item?.height === 'number' ? item.height : undefined,
      source: 'Google Images',
    }))
    .filter((x: ImageItem) => Boolean(x.url))
    .slice(0, 24);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all').toLowerCase(); // all | web | images

  if (!q) {
    return NextResponse.json({ query: q, web: [], images: [] });
  }

  const apifyToken = process.env.APIFY_TOKEN || '';
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';

  try {
    const wantsWeb = type === 'all' || type === 'web';
    const wantsImages = type === 'all' || type === 'images';

    const [webDDG, webWiki, images] = await Promise.all([
      wantsWeb ? fetchDuckDuckGo(q) : Promise.resolve([]),
      wantsWeb ? fetchWikipedia(q) : Promise.resolve([]),
      wantsImages
        ? (async () => {
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

    // merge web results (dedupe by url)
    const webAll = [...webDDG, ...webWiki];
    const seen = new Set<string>();
    const web: WebItem[] = [];
    for (const item of webAll) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      web.push(item);
      if (web.length >= 12) break;
    }

    return NextResponse.json({ query: q, web, images });
  } catch (e: any) {
    return NextResponse.json(
      { query: q, web: [], images: [], error: e?.message || 'Search failed' },
      { status: 500 }
    );
  }
}

