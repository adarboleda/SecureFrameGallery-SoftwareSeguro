import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export const supabase = globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnonKey)

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase
