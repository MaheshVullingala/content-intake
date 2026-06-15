import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,        // stay logged in between sessions
    autoRefreshToken:   true,        // auto refresh JWT
    detectSessionInUrl: true,        // handle password reset links
    storageKey:         "cip-auth",  // unique key avoids clashes with other apps
    storage:            typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

// Get current user profile from users table — always fresh, no cache
export const getUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  // Always read fresh from DB — use auth_id as primary lookup
  const { data: byAuthId, error: e1 } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (byAuthId) return byAuthId;

  // Fallback to email if auth_id not linked yet
  const { data: byEmail, error: e2 } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single();

  if (byEmail) {
    // Link auth_id for future lookups
    await supabase
      .from('users')
      .update({ auth_id: user.id })
      .eq('id', byEmail.id);
    return { ...byEmail, auth_id: user.id };
  }

  return null;
};
