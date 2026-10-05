export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: any) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required or invalid credentials") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", identifier?: string) {
    super(
      identifier ? `${resource} with identifier '${identifier}' not found` : `${resource} not found`,
      404,
      "NOT_FOUND"
    );
  }
}

export class ConflictError extends AppError {
  constructor(message = "A conflict occurred with existing records") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super("Validation failed for request input", 422, "VALIDATION_ERROR", details);
  }
}
