/**
 * Streaming Utilities Tests
 */

import { describe, it, expect, vi } from 'vitest'
import {
  streamSSEResponse,
  extractGoogleText,
  extractOpenAIText,
  extractGroqText,
} from './streaming'

// Helper to create a mock ReadableStream
function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

describe('extractGoogleText', () => {
  it('extracts text from Google Gemini response', () => {
    const data = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello world' }],
          },
        },
      ],
    }

    expect(extractGoogleText(data)).toBe('Hello world')
  })

  it('returns empty string for missing data', () => {
    expect(extractGoogleText({})).toBe('')
    expect(extractGoogleText({ candidates: [] })).toBe('')
    expect(extractGoogleText({ candidates: [{}] })).toBe('')
  })
})

describe('extractOpenAIText', () => {
  it('extracts text from OpenAI response', () => {
    const data = {
      choices: [
        {
          delta: {
            content: 'Hello world',
          },
        },
      ],
    }

    expect(extractOpenAIText(data)).toBe('Hello world')
  })

  it('returns empty string for missing data', () => {
    expect(extractOpenAIText({})).toBe('')
    expect(extractOpenAIText({ choices: [] })).toBe('')
    expect(extractOpenAIText({ choices: [{}] })).toBe('')
  })
})

describe('extractGroqText', () => {
  it('extracts text from Groq response (same as OpenAI)', () => {
    const data = {
      choices: [
        {
          delta: {
            content: 'Hello from Groq',
          },
        },
      ],
    }

    expect(extractGroqText(data)).toBe('Hello from Groq')
  })
})

describe('streamSSEResponse', () => {
  it('streams and accumulates text from SSE events', async () => {
    const chunks = [
      'data: {"text":"Hello"}\n\n',
      'data: {"text":" world"}\n\n',
      'data: [DONE]\n\n',
    ]

    const stream = createMockStream(chunks)
    const onChunk = vi.fn()

    const result = await streamSSEResponse(
      stream,
      onChunk,
      (data: { text?: string }) => data.text || ''
    )

    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello')
    expect(onChunk).toHaveBeenNthCalledWith(2, ' world')
  })

  it('handles empty chunks', async () => {
    const chunks = [
      'data: {"text":""}\n\n',
      'data: {"text":"Hello"}\n\n',
    ]

    const stream = createMockStream(chunks)
    const onChunk = vi.fn()

    await streamSSEResponse(
      stream,
      onChunk,
      (data: { text?: string }) => data.text || ''
    )

    // Empty text should not trigger callback
    expect(onChunk).toHaveBeenCalledTimes(1)
    expect(onChunk).toHaveBeenCalledWith('Hello')
  })

  it('skips invalid JSON', async () => {
    const chunks = [
      'data: invalid json\n\n',
      'data: {"text":"Valid"}\n\n',
    ]

    const stream = createMockStream(chunks)
    const onChunk = vi.fn()

    const result = await streamSSEResponse(
      stream,
      onChunk,
      (data: { text?: string }) => data.text || ''
    )

    expect(result).toBe('Valid')
    expect(onChunk).toHaveBeenCalledTimes(1)
  })

  it('handles chunked SSE data across multiple reads', async () => {
    // Simulate data split across chunks
    const chunks = [
      'data: {"tex',
      't":"Hello"}\n\ndata: {"text":" world"}\n\n',
    ]

    const stream = createMockStream(chunks)
    const onChunk = vi.fn()

    const result = await streamSSEResponse(
      stream,
      onChunk,
      (data: { text?: string }) => data.text || ''
    )

    expect(result).toBe('Hello world')
  })
})

