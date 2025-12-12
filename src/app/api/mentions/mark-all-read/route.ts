import { NextRequest, NextResponse } from 'next/server';

// Mark all mentions as read
export async function PATCH(request: NextRequest) {
  try {
    // console.log('Frontend API: Marking all mentions as read');

    // Get the backend URL from environment or default to localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${backendUrl}/api/mentions/mark-all-read`;
    
    // console.log('Frontend API: Fetching from backend:', url);

    // Forward the request to the backend
    const response = await fetch(url, {
      method: 'PATCH',
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
        { error: 'Failed to mark all mentions as read' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log('Frontend API: Backend data received:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Frontend API: Error marking all mentions as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
