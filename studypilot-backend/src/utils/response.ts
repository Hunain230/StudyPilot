export class ApiResponse {
  static success<T>(
    data: T,
    message = 'OK',
    statusCode = 200
  ) {
    return {
      success: true,
      statusCode,
      message,
      data,
    };
  }

  static error(
    message: string,
    statusCode = 500,
    errors?: Record<string, string>
  ) {
    return {
      success: false,
      statusCode,
      message,
      ...(errors && { errors }),
      data: null,
    };
  }
}
