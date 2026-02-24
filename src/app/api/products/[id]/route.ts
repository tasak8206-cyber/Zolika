import { NextResponse } from 'next/server';
import { Product } from '@/models/Product'; // assuming you have a Product model

// GET individual product by ID
export async function GET(req, { params }) {
    const { id } = params;
    const product = await Product.findById(id);

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
}

// PUT update an individual product by ID
export async function PUT(req, { params }) {
    const { id } = params;
    const newData = await req.json();
    const product = await Product.findByIdAndUpdate(id, newData, { new: true });

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
}

// DELETE an individual product by ID
export async function DELETE(req, { params }) {
    const { id } = params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
}