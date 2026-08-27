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
    // Actually serialize concurrent calls (token refresh in particular)
    // via the browser's native Web Locks API — the same mechanism
    // Supabase's own SDK uses internally for this option.
    //
    // This used to be `async (name, acquireTimeout, fn) => fn()` — a
    // no-op that runs every call immediately with zero serialization,
    // despite the option existing specifically to prevent concurrent
    // calls. Refresh tokens are single-use: any two things that trigger
    // a refresh close together (AI Assist's getAccessToken(), a
    // background poll, two quick clicks) could both fire at once, one
    // gets rejected by the auth server, and the SDK treats that as
    // TOKEN_REFRESH_FAILED — logging the user out mid-action, not for
    // being idle. That's the "logged out while clicking a button / using
    // AI Assist" symptom, not the separate idle-timeout behavior.
    lock: typeof window !== "undefined"
      ? async (name, acquireTimeout, fn) => {
          if (typeof navigator === "undefined" || !navigator.locks) return fn(); // no Web Locks support — best effort, unsynchronized
          const opts = {};
          if (acquireTimeout === 0) {
            opts.ifAvailable = true;
          } else if (acquireTimeout > 0 && typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(acquireTimeout);
          } // acquireTimeout === -1 (or unsupported) — wait indefinitely, navigator.locks' default
          return navigator.locks.request(name, opts, (lock) => {
            if (opts.ifAvailable && !lock) throw new Error("Lock not available");
            return fn();
          });
        }
      : undefined,
  },
  global: {
    // Abort requests that hang longer than 25s. Was 10s, which was the
    // real bottleneck behind login timeouts — a free-tier Supabase project
    // cold-starting after inactivity can take longer than 10s to answer
    // the very first request, and this abort fired before the 12s
    // Promise.race in Login.js/LoginAnimated.js ever got a chance to.
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
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
        // Link auth_id via a SECURITY DEFINER RPC, not a direct client
        // .update() — this table's own users_update RLS policy requires
        // auth_id = auth.uid() to already be true before a row can be
        // updated, which is a chicken-and-egg problem for exactly this
        // first-link case (the row's auth_id is NULL or stale, i.e. NOT
        // yet equal to auth.uid() — that's the whole reason we're here).
        // A direct .update() call here silently fails RLS (0 rows
        // affected, no error surfaced by Supabase's client), so the link
        // never actually lands and every subsequent write that depends on
        // get_user_id()/get_user_role() (requests, tasks, everything)
        // fails with a 42501 forever for that user. link_auth_id_by_email()
        // bypasses RLS narrowly and safely: it only ever links a row whose
        // auth_id IS NULL, matched against the caller's own verified email
        // from auth.users (never a client-supplied value). See
        // sql/16-fix-auth-id-linking.sql.
        const { data: linked, error: linkError } = await supabase.rpc('link_auth_id_by_email');
        if (!linkError && linked) return linked;
        // RPC failed (or another tab/request already linked it) — fall
        // back to the row as originally fetched rather than lying about
        // auth_id being linked when we can't confirm it actually is.
        return byEmail;
      }

      return null;
    } catch(e) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // exponential backoff
    }
  }
  return null;
};
