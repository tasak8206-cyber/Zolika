import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLoginRateLimiter, enforceRateLimit } from '@/lib/ratelimit'
import { RateLimitError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  // Rate limiting: 5 próbálkozás / 15 perc IP-nként
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    await enforceRateLimit(`login:${ip}`, getLoginRateLimiter())
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message },
        {
          status: 429,
          headers: { 'Retry-After': String(err.retryAfter ?? 60) },
        }
      )
    }
    // Redis hiba esetén átengedjük a kérést (fail-open) – logolás nélkül nem blokkolunk
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email és jelszó kötelező!' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch (error) {
    return NextResponse.json(
      { error: 'Bejelentkezési hiba!' },
      { status: 500 }
    )
  }
}