import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // console.log('Frontend API: Searching mentions for server:', serverId, 'query:', query);

    // Get the backend URL from environment or default to localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${backendUrl}/api/mentions/search/${serverId}?q=${encodeURIComponent(query)}`;
    
    // console.log('Frontend API: Fetching from backend:', url);

    // Forward the request to the backend
    const response = await fetch(url, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
    });

    // console.log('Frontend API: Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Frontend API: Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch mentions from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log('Frontend API: Backend data received:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Frontend API: Error in mentions search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
