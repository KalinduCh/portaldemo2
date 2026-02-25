
// src/app/api/send-email/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("DEMO MODE: Email would have been sent with data:", data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ message: 'Email sent successfully (Demo Mode)' }, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/send-email:", err);
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
  }
}
