import type { ResourceContent, ResourceMetadata } from "../types.js";

/**
 * Abstract base class for all MCP resources
 * Provides common functionality and enforces interface contract
 */
export abstract class BaseResource {
  /**
   * Get resource metadata (name, description, URI pattern)
   */
  abstract getMetadata(): ResourceMetadata;

  /**
   * Read resource content based on URI
   * @param uri Full resource URI (e.g., waha://chats/overview?limit=10)
   */
  abstract read(uri: string): Promise<ResourceContent>;

  /**
   * Check if this resource can handle the given URI
   * @param uri Resource URI to check
   */
  abstract canHandle(uri: string): boolean;

  /**
   * Parse URI parameters from query string
   * @param uri Full URI with optional query parameters
   * @returns Parsed parameters object
   */
  protected parseUriParams(uri: string): Record<string, string> {
    const params: Record<string, string> = {};

    try {
      const url = new URL(uri);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch (error) {
      // If URI parsing fails, return empty params
      console.error(`Failed to parse URI params from: ${uri}`, error);
    }

    return params;
  }

  /**
   * Extract path from URI (without protocol and query)
   * @param uri Full URI
   * @returns Path component
   */
  protected extractPath(uri: string): string {
    try {
      const url = new URL(uri);
      return url.pathname;
    } catch (error) {
      // Fallback: extract path manually
      const withoutProtocol = uri.split('://')[1] || uri;
      const withoutQuery = withoutProtocol.split('?')[0];
      return withoutQuery;
    }
  }

  /**
   * Validate required parameters
   * @throws Error if required params are missing
   */
  protected validateParams(
    params: Record<string, string>,
    required: string[]
  ): void {
    const missing = required.filter(key => !params[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required parameters: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Get numeric parameter with default value
   */
  protected getNumberParam(
    params: Record<string, string>,
    key: string,
    defaultValue: number,
    max?: number
  ): number {
    const value = params[key];
    if (!value) return defaultValue;

    const num = parseInt(value, 10);
    if (isNaN(num)) return defaultValue;

    return max !== undefined ? Math.min(num, max) : num;
  }

  /**
   * Get boolean parameter with default value
   */
  protected getBooleanParam(
    params: Record<string, string>,
    key: string,
    defaultValue: boolean
  ): boolean {
    const value = params[key];
    if (!value) return defaultValue;

    return value === 'true' || value === '1';
  }
}
