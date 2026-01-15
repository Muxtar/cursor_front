import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ImageItem = { url: string; title?: string; source: string };

export async function POST(req: Request) {
  const key = process.env.BING_VISUAL_SEARCH_KEY || '';
  const endpoint =
    process.env.BING_VISUAL_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/images/visualsearch';

  if (!key) {
    return NextResponse.json(
      {
        error:
          'Reverse image search requires a provider API key. Set BING_VISUAL_SEARCH_KEY (and optionally BING_VISUAL_SEARCH_ENDPOINT) in Railway Variables.',
      },
      { status: 400 }
    );
  }

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

    // Bing Visual Search expects the binary file in multipart under "image"
    const outForm = new FormData();
    outForm.append('image', file, file.name || 'image');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
      },
      body: outForm,
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Reverse image search failed' }, { status: 502 });
    }

    const results: ImageItem[] = [];
    const tags = Array.isArray(data?.tags) ? data.tags : [];
    for (const tag of tags) {
      const actions = Array.isArray(tag?.actions) ? tag.actions : [];
      for (const action of actions) {
        if (action?.actionType === 'VisualSearch' || action?.actionType === 'PagesIncluding') {
          const value = Array.isArray(action?.data?.value) ? action.data.value : [];
          for (const v of value) {
            const contentUrl = typeof v?.contentUrl === 'string' ? v.contentUrl : '';
            if (contentUrl) {
              results.push({ url: contentUrl, title: v?.name, source: 'Bing Visual Search' });
            }
            if (results.length >= 30) break;
          }
        }
        if (results.length >= 30) break;
      }
      if (results.length >= 30) break;
    }

    return NextResponse.json({ images: results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Reverse image search failed' }, { status: 500 });
  }
}

