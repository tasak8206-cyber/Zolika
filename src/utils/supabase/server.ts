import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Initialize Supabase client for server-side operations.
 * Handles authentication and cookie management.
 */
export const supabaseServerClient = (req: NextRequest) => {
  return createServerSupabaseClient({
    req,
    // Optional cookie and environment configuration
    cookieOptions: {   
      name: 'your-cookie-name', // Set your cookie name here
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
};
