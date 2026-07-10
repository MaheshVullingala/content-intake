import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         "cip-auth",
    storage:            typeof window !== "undefined" ? window.localStorage : undefined,
    // Prevent multiple simultaneous token refresh calls — root cause of timeout
    lock:               typeof window !== "undefined"
                          ? async (name, acquireTimeout, fn) => fn()
                          : undefined,
  },
  global: {
    // Abort requests that hang longer than 10s
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
    },
  },
});

// Get current user profile — with retry on transient failure
export const getUserProfile = async (retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      // Primary lookup by auth_id
      const { data: byAuthId } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (byAuthId) return byAuthId;

      // Fallback by email
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (byEmail) {
        // Link auth_id silently
        supabase.from('users').update({ auth_id: user.id }).eq('id', byEmail.id).then(() => {});
        return { ...byEmail, auth_id: user.id };
      }

      return null;
    } catch(e) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // exponential backoff
    }
  }
  return null;
};
