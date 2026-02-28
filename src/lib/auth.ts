'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase kliens (service role key).
 * Csak szerver-oldali, privilegizált műveletekhez használható.
 * Session kezelés: middleware.ts + @/lib/supabase/middleware
 * Bejelentkezés/kijelentkezés: /api/auth/login és /api/auth/logout route-ok
 */
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Hiányzó Supabase környezeti változók: NEXT_PUBLIC_SUPABASE_URL vagy SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Új felhasználó létrehozása admin jogosultsággal.
 * Az email megerősítést automatikusan jóváhagyja.
 */
export async function signUp(email: string, password: string) {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
    console.error('SignUp error:', err);
    return { success: false, error: message };
  }
}

/**
 * Felhasználó létezésének ellenőrzése az adatbázisban.
 */
export async function verifyUser(email: string) {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return { exists: false };
    }

    return { exists: true, user: data };
  } catch {
    return { exists: false };
  }
}