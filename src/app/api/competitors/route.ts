import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    return NextResponse.json({ competitors: [] });
}

export async function POST(req) {
    const body = await req.json();
    return NextResponse.json({ success: true }, { status: 201 });
}