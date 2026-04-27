import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah di-set di .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
