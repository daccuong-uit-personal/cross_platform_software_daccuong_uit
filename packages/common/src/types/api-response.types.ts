/**
 * Shared API Response Types
 * Matches the unified FE-BE contract defined in `docs/standards/api-standard.md`.
 * Import from `@platform/common` in any service or the gateway.
 */

/**
 * Pagination metadata block placed inside `meta.pagination`.
 * Use for any list/feed endpoint.
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  /** Optional: for cursor-based infinite feeds */
  nextCursor?: string;
}

/**
 * Return this shape from a service method for paginated list endpoints.
 * TransformInterceptor detects the `data + meta` shape and wraps it correctly
 * — no double wrapping.
 *
 * @example
 * async getPosts(page: number): Promise<PaginatedResponse<Post>> {
 *   return {
 *     data: posts,
 *     meta: { pagination: { currentPage: page, ... } },
 *   };
 * }
 */
export interface PaginatedResponse<T> {
  data: T[];
  message?: string;
  meta: {
    pagination: PaginationMeta;
    [key: string]: unknown;
  };
}

/**
 * Standard success response shape produced by `TransformInterceptor`.
 * Used for typing upstream responses received by the gateway proxy.
 */
export interface ApiSuccessResponse<T = unknown> {
  statusCode: number;
  message?: string;
  data: T;
  meta: {
    timestamp: string;
    path: string;
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

/**
 * Standard error response shape produced by `AllExceptionsFilter`.
 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  path?: string;
  timestamp: string;
  /** Validation field errors — key = field name, value = array of messages */
  errors?: Record<string, string[]>;
}
