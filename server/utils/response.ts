
import { Response } from "express";

export class ResponseUtils {
  /**
   * Send success response
   */
  static success(res: Response, data: any, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message: message || "Operation successful",
      data
    });
  }

  /**
   * Send error response
   */
  static error(res: Response, message: string, statusCode: number = 500, error?: any) {
    console.error("API Error:", message, error);
    return res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }

  /**
   * Send validation error
   */
  static validationError(res: Response, message: string, errors?: any) {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  /**
   * Send unauthorized error
   */
  static unauthorized(res: Response, message: string = "Unauthorized access") {
    return res.status(401).json({
      success: false,
      message
    });
  }

  /**
   * Send forbidden error
   */
  static forbidden(res: Response, message: string = "Insufficient permissions") {
    return res.status(403).json({
      success: false,
      message
    });
  }

  /**
   * Send not found error
   */
  static notFound(res: Response, message: string = "Resource not found") {
    return res.status(404).json({
      success: false,
      message
    });
  }

  /**
   * Send internal server error
   */
  static internalError(res: Response, message: string = "Internal server error", error?: any) {
    console.error("Internal Server Error:", message, error);
    return res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }

  /**
   * Send paginated response
   */
  static paginated(res: Response, data: any[], total: number, page: number, limit: number) {
    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  }

  /**
   * Handle async route errors
   */
  static asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Send file download response
   */
  static download(res: Response, data: string, filename: string, contentType: string = 'application/octet-stream') {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(data);
  }
}
