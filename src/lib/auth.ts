'use server';

import { createClient } from '@supabase/supabase-js';

// ✅ NE CACHE-LD! FRISS CLIENT MINDEN REQUESTNÉL!
function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function signUp(email: string, password: string) {
  try {
    // ✅ FRISS CLIENT - NEM CACHED!
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    console.error('SignUp error:', err);
    return { success: false, error: err.message };
  }
}

export async function signIn(email: string, password: string) {
  try {
    // ✅ KLIENS-OLDALI AUTH HELPER
    // Ez a login oldalon hívódik majd
    return { success: true, email };
  } catch (err: any) {
    console.error('SignIn error:', err);
    return { success: false, error: err.message };
  }
}

export async function signOut() {
  try {
    // ✅ KLIENS-OLDALI LOGOUT
    return { success: true };
  } catch (err: any) {
    console.error('SignOut error:', err);
    return { success: false, error: err.message };
  }
}

export async function getSession() {
  try {
    // ✅ SERVER-OLDALI SESSION CHECK
    const supabase = getSupabaseServerClient();
    
    // Ez nem működik anon key-vel - majd middleware-ben fogjuk kezelni
    return null;
  } catch (err: any) {
    console.error('GetSession error:', err);
    return null;
  }
}

export async function verifyUser(email: string) {
  try {
    // ✅ SERVER-OLDALI USER VERIFY
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return { exists: false };
    }

    return { exists: true, user: data };
  } catch (err: any) {
    return { exists: false };
  }
}