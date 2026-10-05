import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";

export function successResponse<T>(data: T, status = 200, meta?: Record<string, any>) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    logger.warn(`[API] Client error (${error.statusCode} ${error.code}): ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: error.statusCode }
    );
  }

  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`[API] Uncaught server error: ${err.message}`, { stack: err.stack });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred. Please try again later.",
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: 500 }
  );
}
