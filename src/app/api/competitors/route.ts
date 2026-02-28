import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/competitors?productId=<uuid>
 * Visszaadja az adott termékhez tartozó versenytárs URL-eket.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'productId paraméter kötelező' }, { status: 400 });
        }

        const supabase = await createClient();

        // Auth ellenőrzés
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('competitor_urls')
            .select('id, competitor_name, url, last_status, last_scraped_at, consecutive_failures, is_active')
            .eq('product_id', productId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ competitors: data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Szerver hiba';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/competitors
 * Új versenytárs URL hozzáadása egy termékhez.
 * Body: { product_id, competitor_name, url }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { product_id, competitor_name, url } = body;

        if (!product_id || !competitor_name || !url) {
            return NextResponse.json(
                { error: 'product_id, competitor_name és url mezők kötelezők' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Auth ellenőrzés
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('competitor_urls')
            .insert({
                product_id,
                competitor_name,
                url,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Szerver hiba';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}