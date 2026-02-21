import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase/server'
import { sendPriceAlert } from '@/lib/email'

// Általános ár selectorok — a legtöbb e-commerce oldalon működnek
const PRICE_SELECTORS = [
  '[data-price]',
  '[itemprop="price"]',
  '.price',
  '.product-price',
  '#priceblock_ourprice',
  '.a-price-whole',
  '[class*="price"]',
]

function extractPrice(html: string): number | null {
  const $ = cheerio.load(html)

  for (const selector of PRICE_SELECTORS) {
    const el = $(selector).first()
    if (!el.length) continue

    const raw = el.attr('data-price')
      ?? el.attr('content')
      ?? el.text()

    // Tisztítás: 29 990 Ft → 29990
    const cleaned = raw
      .replace(/[^\d.,]/g, '')
      .replace(/\s/g, '')
      .replace(',', '.')

    const price = parseFloat(cleaned)
    if (!isNaN(price) && price > 0) return price
  }

  // Fallback: regex az egész HTML-en
  const match = html.match(/["']price["']\s*[":]\s*["']?([\d]+\.?[\d]*)/i)
  return match ? parseFloat(match[1]) : null
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: urls, error } = await supabase
    .from('competitor_urls')
    .select('*, products(own_price, currency)')
    .eq('is_active', true)
    .lt('consecutive_failures', 5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    urls.map(async (competitorUrl) => {
      try {
        const response = await fetch(competitorUrl.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)' },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const html = await response.text()
        const scrapedPrice = extractPrice(html)

        // Delta számítás
        const { data: lastPrice } = await supabase
          .from('price_history')
          .select('scraped_price')
          .eq('competitor_url_id', competitorUrl.id)
          .eq('status', 'success')
          .order('scraped_at', { ascending: false })
          .limit(1)
          .single()

        const prevPrice = lastPrice?.scraped_price ?? null
        const delta = scrapedPrice && prevPrice ? scrapedPrice - prevPrice : null
        const deltaPct = delta && prevPrice ? (delta / prevPrice) * 100 : null

        await supabase.from('price_history').insert({
          // Email értesítés ha a versenytárs olcsóbb
const product = competitorUrl.products as { own_price: number; currency: string }
if (
  scrapedPrice &&
  product?.own_price &&
  scrapedPrice < product.own_price
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', competitorUrl.user_id)
    .single()

  if (profile?.email) {
    await sendPriceAlert({
      to:              profile.email,
      productName:     competitorUrl.competitor_name,
      competitorName:  competitorUrl.competitor_name,
      competitorPrice: scrapedPrice,
      ownPrice:        product.own_price,
      currency:        product.currency,
      url:             competitorUrl.url,
    })
  }
}
          competitor_url_id: competitorUrl.id,
          product_id:        competitorUrl.product_id,
          user_id:           competitorUrl.user_id,
          scraped_price:     scrapedPrice,
          status:            scrapedPrice ? 'success' : 'failed',
          price_delta:       delta,
          price_delta_pct:   deltaPct,
        })

        await supabase
          .from('competitor_urls')
          .update({
            last_scraped_at:      new Date().toISOString(),
            last_status:          scrapedPrice ? 'success' : 'failed',
            consecutive_failures: scrapedPrice ? 0 : competitorUrl.consecutive_failures + 1,
          })
          .eq('id', competitorUrl.id)

        return { id: competitorUrl.id, status: 'success', price: scrapedPrice }

      } catch (err) {
        await supabase.from('price_history').insert({
          competitor_url_id: competitorUrl.id,
          product_id:        competitorUrl.product_id,
          user_id:           competitorUrl.user_id,
          status:            'failed',
          error_message:     err instanceof Error ? err.message : 'Unknown error',
        })

        await supabase
          .from('competitor_urls')
          .update({
            last_status:          'failed',
            consecutive_failures: competitorUrl.consecutive_failures + 1,
          })
          .eq('id', competitorUrl.id)

        return { id: competitorUrl.id, status: 'failed' }
      }
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed    = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({
    message: `Scrape kész: ${succeeded} sikeres, ${failed} sikertelen`,
    total: urls.length,
  })
}