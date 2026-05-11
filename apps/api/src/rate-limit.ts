const bucket = new Map<string, { count: number; resetAt: number }>();
export const checkRateLimit = (key: string, maxPerMinute: number) => {
  const now = Date.now(); const current = bucket.get(key);
  if (!current || now > current.resetAt) { bucket.set(key, { count: 1, resetAt: now + 60_000 }); return; }
  if (current.count >= maxPerMinute) throw new Error("Rate limit exceeded");
  current.count += 1;
};
