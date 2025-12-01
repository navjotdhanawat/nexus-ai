/**
 * Error Handling Utilities
 * Centralized error types and handlers
 */

import { logger } from './logger'

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // API Errors
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_AUTH_FAILED: 'API_AUTH_FAILED',
  API_NOT_FOUND: 'API_NOT_FOUND',
  API_BAD_REQUEST: 'API_BAD_REQUEST',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  API_UNKNOWN: 'API_UNKNOWN',
  // MCP Errors
  MCP_SERVER_NOT_FOUND: 'MCP_SERVER_NOT_FOUND',
  MCP_TOOL_NOT_FOUND: 'MCP_TOOL_NOT_FOUND',
  MCP_CONNECTION_FAILED: 'MCP_CONNECTION_FAILED',
  MCP_REQUEST_TIMEOUT: 'MCP_REQUEST_TIMEOUT',
  // Media Errors
  MEDIA_UNSUPPORTED_FORMAT: 'MEDIA_UNSUPPORTED_FORMAT',
  MEDIA_TOO_LARGE: 'MEDIA_TOO_LARGE',
  MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
  MEDIA_MIC_ACCESS_DENIED: 'MEDIA_MIC_ACCESS_DENIED',
  MEDIA_MIC_NOT_FOUND: 'MEDIA_MIC_NOT_FOUND',
  // Generic
  UNKNOWN: 'UNKNOWN',
  ABORTED: 'ABORTED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ============================================
// App Error Class
// ============================================

/**
 * Custom error class with code and user-friendly message
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly userMessage: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }

  static fromCode(
    code: ErrorCode,
    details?: Record<string, unknown>
  ): AppError {
    const messages = ERROR_MESSAGES[code]
    return new AppError(messages.internal, code, messages.user, details)
  }
}

// ============================================
// Error Messages
// ============================================

const ERROR_MESSAGES: Record<ErrorCode, { internal: string; user: string }> = {
  // API Errors
  [ERROR_CODES.API_KEY_MISSING]: {
    internal: 'API key not configured',
    user: 'API key not configured. Please add your API key in Settings → API Configuration.',
  },
  [ERROR_CODES.API_RATE_LIMIT]: {
    internal: 'Rate limit exceeded',
    user: 'Rate limit exceeded. Please wait a moment and try again.',
  },
  [ERROR_CODES.API_AUTH_FAILED]: {
    internal: 'Authentication failed',
    user: 'Authentication failed. Please check your API key.',
  },
  [ERROR_CODES.API_NOT_FOUND]: {
    internal: 'Resource not found',
    user: 'The requested resource was not found. Please check your configuration.',
  },
  [ERROR_CODES.API_BAD_REQUEST]: {
    internal: 'Bad request',
    user: 'Invalid request. Please check your input.',
  },
  [ERROR_CODES.API_SERVER_ERROR]: {
    internal: 'Server error',
    user: 'Server error. Please try again later.',
  },
  [ERROR_CODES.API_UNKNOWN]: {
    internal: 'Unknown API error',
    user: 'An unexpected error occurred with the API.',
  },
  // MCP Errors
  [ERROR_CODES.MCP_SERVER_NOT_FOUND]: {
    internal: 'MCP server not found',
    user: 'MCP server is not running or not found.',
  },
  [ERROR_CODES.MCP_TOOL_NOT_FOUND]: {
    internal: 'MCP tool not found',
    user: 'The requested tool is not available in any connected MCP server.',
  },
  [ERROR_CODES.MCP_CONNECTION_FAILED]: {
    internal: 'MCP connection failed',
    user: 'Failed to connect to MCP server. Please check the server configuration.',
  },
  [ERROR_CODES.MCP_REQUEST_TIMEOUT]: {
    internal: 'MCP request timeout',
    user: 'Request to MCP server timed out. Please try again.',
  },
  // Media Errors
  [ERROR_CODES.MEDIA_UNSUPPORTED_FORMAT]: {
    internal: 'Unsupported media format',
    user: 'This file format is not supported.',
  },
  [ERROR_CODES.MEDIA_TOO_LARGE]: {
    internal: 'Media file too large',
    user: 'The file is too large. Please use a smaller file.',
  },
  [ERROR_CODES.MEDIA_PROCESSING_FAILED]: {
    internal: 'Media processing failed',
    user: 'Failed to process the file. Please try again.',
  },
  [ERROR_CODES.MEDIA_MIC_ACCESS_DENIED]: {
    internal: 'Microphone access denied',
    user: 'Microphone access was denied. Please enable microphone access in your system settings.',
  },
  [ERROR_CODES.MEDIA_MIC_NOT_FOUND]: {
    internal: 'Microphone not found',
    user: 'No microphone was found. Please connect a microphone and try again.',
  },
  // Generic
  [ERROR_CODES.UNKNOWN]: {
    internal: 'Unknown error',
    user: 'An unexpected error occurred.',
  },
  [ERROR_CODES.ABORTED]: {
    internal: 'Operation aborted',
    user: 'Operation was cancelled.',
  },
}

// ============================================
// Error Handling Functions
// ============================================

/**
 * Handle an error and return a user-friendly message
 */
export function handleError(err: unknown, context: string): string {
  // Handle abort errors
  if (err instanceof Error && err.name === 'AbortError') {
    logger.info(`${context}: Operation aborted`)
    return ERROR_MESSAGES[ERROR_CODES.ABORTED].user
  }

  // Handle our custom errors
  if (err instanceof AppError) {
    logger.error(`${context}: ${err.message}`, { code: err.code, details: err.details })
    return err.userMessage
  }

  // Handle standard errors
  if (err instanceof Error) {
    logger.error(`${context}: ${err.message}`, { error: err })
    return err.message.length > 200 ? `${err.message.substring(0, 200)}...` : err.message
  }

  // Handle unknown errors
  logger.error(`${context}: Unknown error`, { error: err })
  return ERROR_MESSAGES[ERROR_CODES.UNKNOWN].user
}

/**
 * Parse API error response and return an AppError
 */
export function parseApiError(
  errorText: string,
  statusCode: number,
  provider: string
): AppError {
  let code: ErrorCode
  let userMessage: string

  try {
    const errorJson = JSON.parse(errorText)
    const error = errorJson.error || errorJson

    // Determine error type based on status code
    switch (statusCode) {
      case 429: {
        code = ERROR_CODES.API_RATE_LIMIT
        const retryMatch = error.message?.match(/retry in (\d+\.?\d*)/i)
        const retryTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null
        userMessage = retryTime
          ? `Rate limit exceeded. Please wait ${retryTime} seconds and try again.`
          : ERROR_MESSAGES[code].user
        break
      }
      case 401:
      case 403:
        code = ERROR_CODES.API_AUTH_FAILED
        userMessage = `Authentication failed. Please check your ${provider} API key.`
        break
      case 404:
        code = ERROR_CODES.API_NOT_FOUND
        userMessage = error.message?.includes('model')
          ? 'Model not found. The selected model may not be available in your region or API plan.'
          : ERROR_MESSAGES[code].user
        break
      case 400:
        code = ERROR_CODES.API_BAD_REQUEST
        userMessage = error.message?.includes('safety')
          ? 'Content was blocked by safety filters. Please modify your prompt.'
          : `Invalid request: ${error.message || 'Please check your input.'}`
        break
      default:
        if (statusCode >= 500) {
          code = ERROR_CODES.API_SERVER_ERROR
          userMessage = `${provider} server error. Please try again later.`
        } else {
          code = ERROR_CODES.API_UNKNOWN
          const msg = error.message
          userMessage = msg
            ? `${provider} error: ${msg.length > 200 ? `${msg.substring(0, 200)}...` : msg}`
            : `${provider} error (${statusCode})`
        }
    }
  } catch {
    code = ERROR_CODES.API_UNKNOWN
    userMessage =
      errorText.length > 200
        ? `${provider} error (${statusCode}): ${errorText.substring(0, 200)}...`
        : `${provider} error (${statusCode}): ${errorText}`
  }

  return new AppError(`${provider} API error: ${errorText}`, code, userMessage, {
    statusCode,
    provider,
  })
}

/**
 * Create error from media error
 */
export function createMediaError(
  type: 'unsupported_format' | 'too_large' | 'processing_failed' | 'mic_denied' | 'mic_not_found',
  details?: Record<string, unknown>
): AppError {
  const codeMap: Record<string, ErrorCode> = {
    unsupported_format: ERROR_CODES.MEDIA_UNSUPPORTED_FORMAT,
    too_large: ERROR_CODES.MEDIA_TOO_LARGE,
    processing_failed: ERROR_CODES.MEDIA_PROCESSING_FAILED,
    mic_denied: ERROR_CODES.MEDIA_MIC_ACCESS_DENIED,
    mic_not_found: ERROR_CODES.MEDIA_MIC_NOT_FOUND,
  }

  return AppError.fromCode(codeMap[type] ?? ERROR_CODES.UNKNOWN, details)
}

/**
 * Type guard to check if error is an AbortError
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

