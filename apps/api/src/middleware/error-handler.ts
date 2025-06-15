// Global error handling middleware
import { Request, Response, NextFunction } from 'express';
import type { APIResponse } from '@creatoriq/shared-types';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Default error response
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_ERROR';
  
  const response: APIResponse = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    },
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    response.error!.code = 'VALIDATION_ERROR';
    res.status(400);
  } else if (error.name === 'UnauthorizedError') {
    response.error!.code = 'UNAUTHORIZED';
    res.status(401);
  } else if (error.name === 'ForbiddenError') {
    response.error!.code = 'FORBIDDEN';
    res.status(403);
  } else if (error.name === 'NotFoundError') {
    response.error!.code = 'NOT_FOUND';
    res.status(404);
  } else if (error.name === 'RateLimitError') {
    response.error!.code = 'RATE_LIMIT_EXCEEDED';
    res.status(429);
  } else {
    res.status(statusCode);
  }

  res.json(response);
}

// Create specific error types
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}
