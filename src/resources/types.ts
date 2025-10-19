/**
 * Resource-related type definitions for MCP resources
 */

/**
 * Resource URI format: protocol://path?query
 * Example: waha://chats/overview?limit=10
 */
export interface ResourceUri {
  protocol: string;
  path: string;
  params: Record<string, string>;
}

/**
 * Resource metadata
 */
export interface ResourceMetadata {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Resource content
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

/**
 * Cache entry for resource data
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Resource cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxEntries: number;
}
