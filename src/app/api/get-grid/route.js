import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }
    
    const data = await redis.get(`grid:${id}`);
    
    if (!data) {
      return NextResponse.json(
        { error: "Data not found or expired" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(JSON.parse(data), { status: 200 });
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}