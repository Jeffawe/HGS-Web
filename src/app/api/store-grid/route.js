import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Generate unique ID
    const dataId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store data with 1-hour expiration
    await redis.set(`grid:${dataId}`, JSON.stringify(data), { ex: 3600 });
    
    return NextResponse.json({ id: dataId }, { status: 200 });
  } catch (error) {
    console.error('Redis storage error:', error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}