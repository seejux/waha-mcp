import type { CacheConfig, CacheEntry } from "../types.js";

/**
 * Simple in-memory cache for resource data
 * Implements LRU (Least Recently Used) eviction policy
 */
export class ResourceCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private accessOrder: string[]; // Track access order for LRU

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.accessOrder = [];
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access order (move to end = most recently used)
    this.updateAccessOrder(key);

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T): void {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttlSeconds * 1000,
    };

    // Evict if at max capacity
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
    ttlSeconds: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxEntries,
      enabled: this.config.enabled,
      ttlSeconds: this.config.ttlSeconds,
    };
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // First item is least recently used
    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
  }

  /**
   * Remove all expired entries
   */
  pruneExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.delete(key));
  }
}
