import { NextResponse } from 'next/server';

// Sample in-memory products array
let products = [];

// GET method to fetch products
export async function GET() {
    return NextResponse.json(products);
}

// POST method to create a new product
export async function POST(request) {
    const body = await request.json();
    products.push(body);
    return NextResponse.json(body, { status: 201 });
}