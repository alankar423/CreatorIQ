// Common utility types used across the application
export type Timestamp = string; // ISO 8601 format
export type UUID = string;
export type Email = string;
export type URL = string;

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type NonEmptyArray<T> = [T, ...T[]];

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Timestamp;
}

// Error types
export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}
