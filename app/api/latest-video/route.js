import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.youtube.com/@BhajanMarg/videos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      next: { revalidate: 3600 } // cache for 1 hour
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch YouTube page' }, { status: res.status });
    }

    const html = await res.text();
    
    // Find the first video ID from the videos tab (which excludes shorts)
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match ? match[1] : null;

    return NextResponse.json({ videoId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
