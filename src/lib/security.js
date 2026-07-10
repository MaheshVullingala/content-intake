// ── Security utilities ────────────────────────────────────────────────────

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

// Sanitize an object recursively (for payloads before saving)
export const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") result[k] = sanitizeText(v);
    else if (typeof v === "object" && v !== null) result[k] = sanitizePayload(v);
    else result[k] = v;
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

// 3. Get user JWT token for authenticated Supabase REST calls
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
