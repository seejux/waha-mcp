import type { BaseResource } from "../base/BaseResource.js";
import type { ResourceContent, ResourceMetadata } from "../types.js";
import { ResourceCache } from "../cache/ResourceCache.js";

/**
 * Resource Manager
 * Manages registration, discovery, and caching of MCP resources
 */
export class ResourceManager {
  private resources: Map<string, BaseResource>;
  private cache: ResourceCache;

  constructor(cacheEnabled: boolean = true, cacheTtlSeconds: number = 300) {
    this.resources = new Map();
    this.cache = new ResourceCache({
      enabled: cacheEnabled,
      ttlSeconds: cacheTtlSeconds,
      maxEntries: 100,
    });

    // Start cache pruning interval (every 5 minutes)
    if (cacheEnabled) {
      setInterval(() => {
        this.cache.pruneExpired();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Register a new resource
   */
  register(resource: BaseResource): void {
    const metadata = resource.getMetadata();
    this.resources.set(metadata.uri, resource);
  }

  /**
   * Unregister a resource
   */
  unregister(uri: string): void {
    this.resources.delete(uri);
  }

  /**
   * List all available resources
   */
  listResources(): ResourceMetadata[] {
    return Array.from(this.resources.values()).map(resource =>
      resource.getMetadata()
    );
  }

  /**
   * Read a resource by URI
   * Checks cache first, then fetches if needed
   */
  async readResource(uri: string): Promise<ResourceContent> {
    // Check cache first
    const cached = this.cache.get<ResourceContent>(uri);
    if (cached) {
      return cached;
    }

    // Find resource that can handle this URI
    const resource = this.findResourceForUri(uri);
    if (!resource) {
      throw new Error(
        `No resource handler found for URI: ${uri}\n` +
        `Available resources:\n${this.listResources()
          .map(r => `  - ${r.uri}`)
          .join('\n')}`
      );
    }

    // Fetch resource content
    const content = await resource.read(uri);

    // Cache the result
    this.cache.set(uri, content);

    return content;
  }

  /**
   * Find resource that can handle the given URI
   */
  private findResourceForUri(uri: string): BaseResource | null {
    for (const resource of this.resources.values()) {
      if (resource.canHandle(uri)) {
        return resource;
      }
    }
    return null;
  }

  /**
   * Clear resource cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Check if a URI can be handled
   */
  canHandle(uri: string): boolean {
    return this.findResourceForUri(uri) !== null;
  }

  /**
   * Get resource metadata by URI pattern
   */
  getResourceMetadata(uriPattern: string): ResourceMetadata | null {
    const resource = this.resources.get(uriPattern);
    return resource ? resource.getMetadata() : null;
  }
}
