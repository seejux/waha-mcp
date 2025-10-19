/**
 * Resources module exports
 * Central export point for all resource-related functionality
 */

// Base classes and types
export { BaseResource } from "./base/BaseResource.js";
export type {
  ResourceUri,
  ResourceMetadata,
  ResourceContent,
  CacheEntry,
  CacheConfig,
} from "./types.js";

// Cache
export { ResourceCache } from "./cache/ResourceCache.js";

// Manager
export { ResourceManager } from "./manager/ResourceManager.js";

// Resource implementations
export { ChatsOverviewResource } from "./implementations/ChatsOverviewResource.js";
export { ChatMessagesResource } from "./implementations/ChatMessagesResource.js";

// Factory function to create and configure resource manager
import type { WAHAClient } from "../client/index.js";
import { ResourceManager } from "./manager/ResourceManager.js";
import { ChatsOverviewResource } from "./implementations/ChatsOverviewResource.js";
import { ChatMessagesResource } from "./implementations/ChatMessagesResource.js";

/**
 * Create a fully configured ResourceManager with all available resources
 * @param wahaClient WAHA API client instance
 * @param cacheEnabled Enable caching (default: true)
 * @param cacheTtlSeconds Cache TTL in seconds (default: 300 = 5 minutes)
 */
export function createResourceManager(
  wahaClient: WAHAClient,
  cacheEnabled: boolean = true,
  cacheTtlSeconds: number = 300
): ResourceManager {
  const manager = new ResourceManager(cacheEnabled, cacheTtlSeconds);

  // Register all resources
  manager.register(new ChatsOverviewResource(wahaClient));
  manager.register(new ChatMessagesResource(wahaClient));

  return manager;
}
