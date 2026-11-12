/**
 * Minimal in-memory fixed-window rate limiter (per key, e.g. client IP)
 */

export class RateLimiter {
  constructor({ windowMs = 60 * 1000, max = 30 } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map();
    this.sweepTimer = setInterval(() => this.sweep(), windowMs);
    if (typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  check(key) {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now - entry.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      return { allowed: true, remaining: this.max - 1 };
    }

    entry.count += 1;
    if (entry.count > this.max) {
      return { allowed: false, retryAfterMs: entry.start + this.windowMs - now };
    }
    return { allowed: true, remaining: this.max - entry.count };
  }

  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      if (now - entry.start >= this.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  close() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}

export default RateLimiter;
