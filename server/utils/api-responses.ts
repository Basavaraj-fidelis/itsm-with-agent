
import { Response } from 'express';

export class ApiResponses {
  static success(res: Response, data: any, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  static created(res: Response, data: any, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  static badRequest(res: Response, message = 'Bad request', errors?: any) {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message
    });
  }

  static notFound(res: Response, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static serverError(res: Response, message = 'Internal server error', error?: any) {
    console.error('Server Error:', error);
    return res.status(500).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
  }

  static paginated(res: Response, data: any[], pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }) {
    return res.status(200).json({
      success: true,
      data,
      pagination
    });
  }
}
