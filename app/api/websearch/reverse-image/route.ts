import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ImageItem = { url: string; title?: string; source: string };

// Free: Google Images reverse search (via scraping simulation - returns Google link)
async function searchGoogleImagesFree(imageUrl: string): Promise<ImageItem[]> {
  // Google Images reverse search doesn't have a free API
  // We return empty and provide the Google link instead
  return [];
}

// Free: Yandex Images reverse search
async function searchYandexImages(imageUrl: string): Promise<ImageItem[]> {
  try {
    // Yandex Images reverse search endpoint
    // Note: Yandex may require API key for some endpoints, but we try the public one first
    const t = withTimeout(10000);
    const res = await fetch(
      `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: t.signal,
      }
    );
    t.done();
    
    // Yandex doesn't provide a direct API, so we parse HTML or use alternative
    // For now, return empty and let Apify handle it
    return [];
  } catch {
    return [];
  }
}

// Paid: Apify Google Images reverse search (last resort)
async function searchApifyReverseImage(imageUrl: string, token: string): Promise<ImageItem[]> {
  try {
    const t = withTimeout(20000);
    const res = await fetch(
      'https://api.apify.com/v2/acts/apify~google-image-scraper/run-sync-get-dataset-items',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl, maxResults: 30 }),
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
        title: safeString(item?.title) || '',
        source: 'Apify Google Images',
      }))
      .filter((x: ImageItem) => Boolean(x.url))
      .slice(0, 30);
  } catch {
    return [];
  }
}

function safeString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

export async function POST(req: Request) {
  const serpApiKey = process.env.SERP_API_KEY || '';
  const apifyToken = process.env.APIFY_TOKEN || '';
  const imgbbKey = process.env.IMGBB_API_KEY || '';

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing image file (field name: image)' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString('base64');

    // Upload image to Imgur (public URL) - try multiple client IDs
    const uploadToImgur = async (): Promise<string | null> => {
      const clientIds = [
        '546c25a59c58ad7', // Original
        '1ceddedc03a5d71', // Alternative 1
        'f0ea04148a542d9', // Alternative 2
      ];
      
      for (const clientId of clientIds) {
        try {
          const res = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
              Authorization: `Client-ID ${clientId}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64, type: 'base64' }),
            signal: withTimeout(10000).signal,
          });
          if (res.ok) {
            const data: any = await res.json().catch(() => ({}));
            if (data?.data?.link) return data.data.link;
          }
        } catch (e) {
          // Try next client ID
          continue;
        }
      }
      return null;
    };

    // Upload to ImgBB (requires key)
    const uploadToImgBB = async (): Promise<string | null> => {
      if (!imgbbKey) return null;
      try {
        const formData = new URLSearchParams();
        formData.append('image', base64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey)}`, {
          method: 'POST',
          body: formData,
          signal: withTimeout(10000).signal,
        });
        if (!res.ok) return null;
        const data: any = await res.json().catch(() => ({}));
        return data?.data?.url || null;
      } catch {
        return null;
      }
    };

    // Upload to PostImg.cc (free, no key required)
    const uploadToPostImg = async (): Promise<string | null> => {
      try {
        const formData = new FormData();
        const blob = Buffer.from(base64, 'base64');
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
        formData.append('upload', file);
        
        const res = await fetch('https://postimg.cc/json/upload', {
          method: 'POST',
          body: formData,
          signal: withTimeout(10000).signal,
        });
        if (!res.ok) return null;
        const data: any = await res.json().catch(() => ({}));
        return data?.url || data?.url_full || null;
      } catch {
        return null;
      }
    };

    // Try multiple upload services
    const imageUrl = (await uploadToImgur()) || (await uploadToImgBB()) || (await uploadToPostImg());

    // Create Google and Yandex search links
    // If upload failed, provide manual upload links
    const googleByImageUrl = imageUrl 
      ? `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}`
      : 'https://www.google.com/imghp?hl=en&tab=wi'; // Manual upload page
    
    const yandexByImageUrl = imageUrl
      ? `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`
      : 'https://yandex.com/images/'; // Manual upload page

    let results: ImageItem[] = [];

    // Priority 1: SerpAPI (if key available and we have a public URL)
    if (serpApiKey && imageUrl && !imageUrl.startsWith('data:')) {
      try {
        const serpRes = await fetch(
          `https://serpapi.com/search.json?engine=google_images&image_url=${encodeURIComponent(imageUrl)}&api_key=${encodeURIComponent(serpApiKey)}`,
          { signal: withTimeout(15000).signal }
        );
        if (serpRes.ok) {
          const serpData: any = await serpRes.json().catch(() => ({}));
          const imagesResults = Array.isArray(serpData?.images_results) ? serpData.images_results : [];
          results = imagesResults
            .map((r: any) => ({
              url: safeString(r?.thumbnail) || safeString(r?.original) || safeString(r?.link) || '',
              title: safeString(r?.title) || '',
              source: 'SerpAPI Google Images',
            }))
            .filter((x: ImageItem) => Boolean(x.url))
            .slice(0, 30);
        }
      } catch (e) {
        console.error('SerpAPI error:', e);
      }
    }

    // Priority 2: Try Yandex (free, but limited) - only if we have public URL
    if (results.length === 0 && imageUrl && !imageUrl.startsWith('data:')) {
      const yandexResults = await searchYandexImages(imageUrl);
      if (yandexResults.length > 0) {
        results = yandexResults;
      }
    }

    // Priority 3: Apify (last resort, requires key) - only if we have public URL
    if (results.length === 0 && apifyToken && imageUrl && !imageUrl.startsWith('data:')) {
      const apifyResults = await searchApifyReverseImage(imageUrl, apifyToken);
      if (apifyResults.length > 0) {
        results = apifyResults;
      }
    }

    // Return results with alternative links
    // Always return Google/Yandex links even if upload failed
    return NextResponse.json({
      images: results,
      googleByImageUrl,
      yandexByImageUrl,
      uploadedImageUrl: imageUrl || null,
      // If upload failed, inform user but still provide search links
      ...(imageUrl ? {} : { info: 'Image upload failed, but you can use the Google/Yandex links below to search manually.' }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Reverse image search failed' }, { status: 500 });
  }
}
