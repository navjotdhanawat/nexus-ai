/**
 * Error Handling Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  ERROR_CODES,
  handleError,
  parseApiError,
  createMediaError,
  isAbortError,
} from './errors'

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AppError', () => {
  it('creates an error with code and user message', () => {
    const error = new AppError(
      'Internal error message',
      ERROR_CODES.API_KEY_MISSING,
      'User-friendly message'
    )

    expect(error.message).toBe('Internal error message')
    expect(error.code).toBe(ERROR_CODES.API_KEY_MISSING)
    expect(error.userMessage).toBe('User-friendly message')
    expect(error.name).toBe('AppError')
  })

  it('creates error from code', () => {
    const error = AppError.fromCode(ERROR_CODES.API_RATE_LIMIT)

    expect(error.code).toBe(ERROR_CODES.API_RATE_LIMIT)
    expect(error.userMessage).toContain('Rate limit')
  })

  it('includes details when provided', () => {
    const error = AppError.fromCode(ERROR_CODES.API_KEY_MISSING, {
      provider: 'Google',
    })

    expect(error.details).toEqual({ provider: 'Google' })
  })
})

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles AbortError', () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'

    const result = handleError(abortError, 'Test')

    expect(result).toContain('cancelled')
  })

  it('handles AppError', () => {
    const appError = new AppError(
      'Internal',
      ERROR_CODES.API_AUTH_FAILED,
      'Auth failed'
    )

    const result = handleError(appError, 'Test')

    expect(result).toBe('Auth failed')
  })

  it('handles standard Error', () => {
    const error = new Error('Something went wrong')

    const result = handleError(error, 'Test')

    expect(result).toBe('Something went wrong')
  })

  it('truncates long error messages', () => {
    const longMessage = 'A'.repeat(300)
    const error = new Error(longMessage)

    const result = handleError(error, 'Test')

    expect(result.length).toBeLessThan(250)
    expect(result).toContain('...')
  })

  it('handles unknown error types', () => {
    const result = handleError('string error', 'Test')

    expect(result).toContain('unexpected')
  })
})

describe('parseApiError', () => {
  it('parses rate limit error (429)', () => {
    const errorText = JSON.stringify({
      error: { message: 'Rate limited, retry in 30 seconds' },
    })

    const error = parseApiError(errorText, 429, 'Google')

    expect(error.code).toBe(ERROR_CODES.API_RATE_LIMIT)
    expect(error.userMessage).toContain('30')
  })

  it('parses auth error (401)', () => {
    const errorText = JSON.stringify({
      error: { message: 'Invalid API key' },
    })

    const error = parseApiError(errorText, 401, 'OpenAI')

    expect(error.code).toBe(ERROR_CODES.API_AUTH_FAILED)
    expect(error.userMessage).toContain('OpenAI')
    expect(error.userMessage).toContain('API key')
  })

  it('parses not found error (404)', () => {
    const errorText = JSON.stringify({
      error: { message: 'Model not found' },
    })

    const error = parseApiError(errorText, 404, 'Google')

    expect(error.code).toBe(ERROR_CODES.API_NOT_FOUND)
    expect(error.userMessage).toContain('not found')
  })

  it('parses safety filter error (400)', () => {
    const errorText = JSON.stringify({
      error: { message: 'Content blocked by safety filters' },
    })

    const error = parseApiError(errorText, 400, 'Google')

    expect(error.code).toBe(ERROR_CODES.API_BAD_REQUEST)
    expect(error.userMessage).toContain('safety')
  })

  it('parses server error (500)', () => {
    const errorText = JSON.stringify({
      error: { message: 'Internal server error' },
    })

    const error = parseApiError(errorText, 500, 'Groq')

    expect(error.code).toBe(ERROR_CODES.API_SERVER_ERROR)
    expect(error.userMessage).toContain('Groq')
  })

  it('handles non-JSON error text', () => {
    const error = parseApiError('Plain text error', 500, 'Google')

    expect(error.code).toBe(ERROR_CODES.API_UNKNOWN)
    expect(error.userMessage).toContain('Plain text error')
  })
})

describe('createMediaError', () => {
  it('creates unsupported format error', () => {
    const error = createMediaError('unsupported_format')

    expect(error.code).toBe(ERROR_CODES.MEDIA_UNSUPPORTED_FORMAT)
  })

  it('creates file too large error', () => {
    const error = createMediaError('too_large', { size: 100 })

    expect(error.code).toBe(ERROR_CODES.MEDIA_TOO_LARGE)
    expect(error.details).toEqual({ size: 100 })
  })

  it('creates mic access denied error', () => {
    const error = createMediaError('mic_denied')

    expect(error.code).toBe(ERROR_CODES.MEDIA_MIC_ACCESS_DENIED)
  })
})

describe('isAbortError', () => {
  it('returns true for AbortError', () => {
    const error = new Error('Aborted')
    error.name = 'AbortError'

    expect(isAbortError(error)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isAbortError(new Error('Test'))).toBe(false)
    expect(isAbortError('string')).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})

