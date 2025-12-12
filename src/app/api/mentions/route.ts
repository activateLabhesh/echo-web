import { NextRequest, NextResponse } from 'next/server';

// Get mentions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // console.log('Frontend API: Getting mentions for user:', userId);

    // Get the backend URL from environment or default to localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${backendUrl}/api/mentions?userId=${encodeURIComponent(userId)}`;
    
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
    console.error('Frontend API: Error in mentions fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
