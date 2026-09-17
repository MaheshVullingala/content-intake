// ── Security utilities ────────────────────────────────────────────────────
import { sanitizeRichText } from "./richText";

// 1. XSS sanitization — strip HTML tags and dangerous characters from text input
export const sanitizeText = (str) => {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/javascript:/gi, "")      // strip javascript: protocol
    .replace(/on\w+\s*=/gi, "")        // strip event handlers like onerror=
    .replace(/data:/gi, "")            // strip data: URIs
    .trim();
};

// Sanitize an object recursively (for payloads before saving).
//
// `richTextKeys` is an optional list of object keys (e.g. ["description"])
// that hold hand-built rich-text HTML (see src/lib/richText.js — used by
// the Others section) rather than plain text. Those keys are routed
// through the allowlist-based sanitizeRichText() instead of sanitizeText(),
// which would otherwise strip every <p>/<ul>/<li>/<strong> tag along with
// anything actually dangerous. The key match applies at every nesting
// level, so it works whether the rich-text field sits at the top of the
// payload or inside an array of card/item objects (e.g. oth_items[].description).
export const sanitizePayload = (obj, richTextKeys = []) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizePayload(item, richTextKeys));
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      result[k] = richTextKeys.includes(k) ? sanitizeRichText(v) : sanitizeText(v);
    } else if (typeof v === "object" && v !== null) {
      result[k] = sanitizePayload(v, richTextKeys);
    } else {
      result[k] = v;
    }
  }
  return result;
};

// 2. File upload validation — check MIME type and size
export const validateFile = (file, options = {}) => {
  const { maxSizeMB = 10, allowedTypes = ["image/jpeg","image/png","image/gif","image/webp","image/svg+xml"] } = options;

  if (!file) return { valid: false, error: "No file provided" };

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Accepted: ${allowedTypes.map(t => t.split("/")[1]).join(", ")}` };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum size is ${maxSizeMB}MB` };
  }

  // Additional check: verify file extension matches MIME type
  const ext = file.name.split(".").pop().toLowerCase();
  const validExts = { "image/jpeg": ["jpg","jpeg"], "image/png": ["png"], "image/gif": ["gif"], "image/webp": ["webp"], "image/svg+xml": ["svg"] };
  const allowed = validExts[file.type] || [];
  if (!allowed.includes(ext)) {
    return { valid: false, error: `File extension .${ext} doesn't match file type` };
  }

  return { valid: true };
};

// 3a. Get the current session's raw access token, for calling our own
// /api/* routes with an Authorization: Bearer header (those routes verify
// it server-side with supabase.auth.getUser(token) — see /api/ai and
// /api/audit). Returns null if there's no active session.
export const getAccessToken = async (supabase) => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// 3b. Get user JWT token for authenticated Supabase REST calls
export const getAuthHeaders = async (supabase) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    "Content-Type":  "application/json",
    "apikey":        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token}`,   // JWT token instead of anon key
    "Prefer":        "return=minimal",
  };
};

// 4. In-memory rate limiter for API routes
const rateLimitMap = new Map();
export const rateLimit = (identifier, maxRequests = 10, windowMs = 60000) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(identifier)) rateLimitMap.set(identifier, []);
  const requests = rateLimitMap.get(identifier).filter(t => t > windowStart);
  requests.push(now);
  rateLimitMap.set(identifier, requests);

  // Cleanup old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every(t => t < windowStart)) rateLimitMap.delete(key);
    }
  }

  return { allowed: requests.length <= maxRequests, remaining: Math.max(0, maxRequests - requests.length) };
};
