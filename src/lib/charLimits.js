"use client";
import { useEffect, useState } from "react";

// Generic character-limit-override hook. Starts with `defaults` (a flat
// {key: number} map) so there's never a loading flicker or missing-limit
// gap — the static defaults from constants.js are always correct even
// before the DB round-trip resolves — then merges in any admin-saved
// overrides from char_limit_overrides once fetched.
//
// Used with two different default sets today, both reading from the same
// table since their key names never collide:
//   - constants.js's CHAR_LIMITS (flat top-level fields: page_title,
//     kb_impact, etc.) in NewRequest.js / ProposeChangeWizard.js
//   - EditSectionModal.js's own ITEM_LIMITS (shared card-array
//     sub-fields: title/description/quote/customer, one set applied
//     across every section's card items — not per-section-granular,
//     since that's not how the underlying edit UI enforces limits today)
export function useCharLimits(supabase, defaults) {
  const [limits, setLimits] = useState(defaults);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.from("char_limit_overrides").select("key, value").then(({ data, error }) => {
      if (cancelled || error || !data?.length) return;
      setLimits(() => {
        const merged = { ...defaults };
        data.forEach(row => { merged[row.key] = row.value; });
        return merged;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return limits;
}
