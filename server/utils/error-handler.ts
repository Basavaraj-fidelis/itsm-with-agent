
import { Request, Response, NextFunction } from 'express';
import { ApiResponses } from './api-responses';

export class ErrorHandler {
  static async asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static globalErrorHandler(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    console.error('Global Error Handler:', error);

    // Database errors
    if (error.code === '23505') { // Unique constraint violation
      return ApiResponses.badRequest(res, 'Duplicate entry found');
    }

    if (error.code === '23503') { // Foreign key constraint violation
      return ApiResponses.badRequest(res, 'Referenced record not found');
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return ApiResponses.unauthorized(res, 'Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      return ApiResponses.unauthorized(res, 'Token expired');
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return ApiResponses.badRequest(res, 'Validation failed', error.errors);
    }

    // Default server error
    return ApiResponses.serverError(res, 'Something went wrong');
  }

  static notFoundHandler(req: Request, res: Response) {
    return ApiResponses.notFound(res, `Route ${req.originalUrl} not found`);
  }
}
