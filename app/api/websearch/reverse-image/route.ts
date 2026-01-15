import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ImageItem = { url: string; title?: string; source: string };

export async function POST(req: Request) {
  // Reverse image search via SerpAPI (recommended, matches the previous websearch project style)
  // Requires SERP_API_KEY. If missing, we still return a helpful message instead of hard-failing.
  const serpApiKey = process.env.SERP_API_KEY || '';
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

    // Upload image to Imgur (public URL) with a public client-id (same style as the original project).
    // If Imgur fails, fallback to ImgBB (requires IMGBB_API_KEY).
    const uploadToImgur = async (): Promise<string | null> => {
      try {
        const res = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: 'Client-ID 546c25a59c58ad7',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64, type: 'base64' }),
        });
        if (!res.ok) return null;
        const data: any = await res.json().catch(() => ({}));
        return data?.data?.link || null;
      } catch {
        return null;
      }
    };

    const uploadToImgBB = async (): Promise<string | null> => {
      if (!imgbbKey) return null;
      try {
        const formData = new URLSearchParams();
        formData.append('image', base64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbKey)}`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) return null;
        const data: any = await res.json().catch(() => ({}));
        return data?.data?.url || null;
      } catch {
        return null;
      }
    };

    const imageUrl = (await uploadToImgur()) || (await uploadToImgBB());
    if (!imageUrl) {
      return NextResponse.json(
        {
          images: [],
          error: 'Failed to upload image for reverse search. Try again or set IMGBB_API_KEY.',
        },
        { status: 502 }
      );
    }

    const googleByImageUrl = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}`;

    if (!serpApiKey) {
      // No key: return Google link (no error, just provide alternative)
      return NextResponse.json({
        images: [],
        googleByImageUrl,
        uploadedImageUrl: imageUrl,
      });
    }

    // SerpAPI reverse image search (google_images engine)
    const serpRes = await fetch(
      `https://serpapi.com/search.json?engine=google_images&image_url=${encodeURIComponent(imageUrl)}&api_key=${encodeURIComponent(
        serpApiKey
      )}`
    );
    const serpData: any = await serpRes.json().catch(() => ({}));
    if (!serpRes.ok) {
      return NextResponse.json(
        { images: [], error: serpData?.error || 'SerpAPI reverse search failed', googleByImageUrl, uploadedImageUrl: imageUrl },
        { status: 502 }
      );
    }

    const imagesResults = Array.isArray(serpData?.images_results) ? serpData.images_results : [];
    const results: ImageItem[] = imagesResults
      .map((r: any) => ({
        url: typeof r?.thumbnail === 'string' ? r.thumbnail : typeof r?.original === 'string' ? r.original : typeof r?.link === 'string' ? r.link : '',
        title: typeof r?.title === 'string' ? r.title : undefined,
        source: 'SerpAPI Google Images',
      }))
      .filter((x: ImageItem) => Boolean(x.url))
      .slice(0, 30);

    return NextResponse.json({ images: results, googleByImageUrl, uploadedImageUrl: imageUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Reverse image search failed' }, { status: 500 });
  }
}

