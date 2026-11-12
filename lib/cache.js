import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'cache.sqlite');
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_MEMORY_ENTRIES = 200;

class QueryCache {
  constructor(dbPath = DB_PATH, ttlMs = DEFAULT_TTL_MS, maxMemoryEntries = DEFAULT_MAX_MEMORY_ENTRIES) {
    this.ttlMs = ttlMs;
    this.maxMemoryEntries = maxMemoryEntries;
    this.memoryCache = new Map();
    this.useSqlite = true;
    this.pruneTimer = null;

    try {
      this.db = new DatabaseSync(dbPath);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS query_cache (
          key TEXT PRIMARY KEY,
          bbox TEXT,
          categories TEXT,
          data TEXT,
          count INTEGER,
          created_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_cache_created ON query_cache (created_at);
      `);
    } catch (err) {
      console.warn('SQLite init warning, falling back to in-memory cache:', err.message);
      this.useSqlite = false;
    }

    if (this.ttlMs > 0) {
      this.pruneTimer = setInterval(() => this.prune(), this.ttlMs);
      if (typeof this.pruneTimer.unref === 'function') {
        this.pruneTimer.unref();
      }
    }
  }

  close() {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    if (this.useSqlite && this.db) {
      try {
        this.db.close();
      } catch (err) {
        // silent
      }
    }
  }

  get(key) {
    const now = Date.now();

    if (this.useSqlite && this.db) {
      try {
        const stmt = this.db.prepare('SELECT data, created_at FROM query_cache WHERE key = ?');
        const row = stmt.get(key);
        if (row) {
          if (now - row.created_at < this.ttlMs) {
            return JSON.parse(row.data);
          } else {
            this.delete(key);
          }
        }
      } catch (err) {
        console.error('Cache read error:', err.message);
      }
    }

    const memItem = this.memoryCache.get(key);
    if (memItem) {
      if (now - memItem.createdAt < this.ttlMs) {
        return memItem.data;
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  set(key, bbox, categories, data, count = 0) {
    const now = Date.now();
    const categoriesStr = Array.isArray(categories) ? categories.join(',') : String(categories || '');
    const dataStr = JSON.stringify(data);

    if (this.useSqlite && this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO query_cache (key, bbox, categories, data, count, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            bbox = excluded.bbox,
            categories = excluded.categories,
            data = excluded.data,
            count = excluded.count,
            created_at = excluded.created_at
        `);
        stmt.run(key, bbox, categoriesStr, dataStr, count, now);
      } catch (err) {
        console.error('Cache write error:', err.message);
      }
    }

    this.memoryCache.delete(key);
    this.memoryCache.set(key, { data, createdAt: now });

    if (this.memoryCache.size > this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
  }

  delete(key) {
    if (this.useSqlite && this.db) {
      try {
        const stmt = this.db.prepare('DELETE FROM query_cache WHERE key = ?');
        stmt.run(key);
      } catch (err) {
        // silent
      }
    }
    this.memoryCache.delete(key);
  }

  clear() {
    if (this.useSqlite && this.db) {
      try {
        this.db.exec('DELETE FROM query_cache');
      } catch (err) {
        // silent
      }
    }
    this.memoryCache.clear();
  }

  prune() {
    const cutoff = Date.now() - this.ttlMs;
    if (this.useSqlite && this.db) {
      try {
        const stmt = this.db.prepare('DELETE FROM query_cache WHERE created_at < ?');
        stmt.run(cutoff);
      } catch (err) {
        // silent
      }
    }
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.createdAt < cutoff) {
        this.memoryCache.delete(key);
      }
    }
  }

  stats() {
    let count = this.memoryCache.size;
    if (this.useSqlite && this.db) {
      try {
        const row = this.db.prepare('SELECT COUNT(*) as cnt FROM query_cache').get();
        if (row) count = row.cnt;
      } catch (err) {
        // silent
      }
    }
    return { cachedQueries: count, sqliteActive: this.useSqlite };
  }
}

export { QueryCache };
export const queryCache = new QueryCache();
export default QueryCache;
