/**
 * SSE Streaming Utilities
 * Generic helpers for handling Server-Sent Events streams
 */

// ============================================
// Types
// ============================================

export interface StreamOptions {
  /** Callback for each chunk of text */
  onChunk: (chunk: string) => void
  /** Optional signal for aborting */
  signal?: AbortSignal
}

export type TextExtractor<T> = (data: T) => string

// ============================================
// Generic SSE Stream Handler
// ============================================

/**
 * Process a Server-Sent Events stream and extract text content
 * Works with Google, OpenAI, and Groq APIs
 *
 * @param body - The ReadableStream from the fetch response
 * @param onChunk - Callback for each chunk of text
 * @param extractText - Function to extract text from parsed JSON data
 * @returns The complete accumulated text
 */
export async function streamSSEResponse<T = unknown>(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
  extractText: TextExtractor<T>
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr) as T
              const text = extractText(data)
              if (text) {
                fullText += text
                onChunk(text)
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim()
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const data = JSON.parse(jsonStr) as T
          const text = extractText(data)
          if (text) {
            fullText += text
            onChunk(text)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullText
}

// ============================================
// Provider-Specific Text Extractors
// ============================================

interface GoogleStreamData {
  candidates?: {
    content?: {
      parts?: {
        text?: string
      }[]
    }
  }[]
}

interface OpenAIStreamData {
  choices?: {
    delta?: {
      content?: string
    }
  }[]
}

/** Extract text from Google Gemini SSE response */
export const extractGoogleText: TextExtractor<GoogleStreamData> = (data) => {
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/** Extract text from OpenAI SSE response */
export const extractOpenAIText: TextExtractor<OpenAIStreamData> = (data) => {
  return data.choices?.[0]?.delta?.content || ''
}

/** Extract text from Groq SSE response (same as OpenAI) */
export const extractGroqText = extractOpenAIText

// ============================================
// Convenience Functions
// ============================================

/**
 * Stream Google Gemini response
 */
export function streamGoogleResponse(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSEResponse(body, onChunk, extractGoogleText)
}

/**
 * Stream OpenAI response
 */
export function streamOpenAIResponse(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSEResponse(body, onChunk, extractOpenAIText)
}

/**
 * Stream Groq response
 */
export function streamGroqResponse(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSEResponse(body, onChunk, extractGroqText)
}

