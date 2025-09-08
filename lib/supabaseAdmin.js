import { createClient } from '@supabase/supabase-js';

// Server-only client using the SERVICE ROLE key.
// Add SUPABASE_SERVICE_ROLE_KEY in your .env.local (never expose to the client!)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
