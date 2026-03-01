import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/csrf
 * CSRF token generálása és visszaadása a kliens számára.
 * Csak bejelentkezett felhasználóknak.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await generateCSRFToken()
    return NextResponse.json({ csrfToken: token })
}
