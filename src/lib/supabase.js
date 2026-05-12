import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:    true,   // stay logged in between sessions
    autoRefreshToken:  true,   // auto refresh JWT
    detectSessionInUrl:true,   // handle password reset links
  },
});

// Get current user profile from users table
export const getUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  // Try auth_id first, fall back to email match
  let profile = null;

  const { data: byAuthId } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (byAuthId) {
    profile = byAuthId;
  } else {
    // Fall back to email lookup and auto-link auth_id
    const { data: byEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (byEmail) {
      // Auto-link auth_id so future lookups are faster
      await supabase
        .from('users')
        .update({ auth_id: user.id })
        .eq('id', byEmail.id);
      profile = { ...byEmail, auth_id: user.id };
    }
  }

  return profile;
};
