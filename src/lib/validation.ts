/**
 * Validation Schemas
 * Zod schemas for form validation
 */

import { z } from 'zod'

// ============================================
// MCP Server Validation Schemas
// ============================================

/**
 * Base server configuration schema
 */
const baseServerSchema = z.object({
  name: z
    .string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be less than 100 characters'),
})

/**
 * Stdio server configuration schema
 */
export const stdioServerSchema = baseServerSchema.extend({
  transport: z.literal('stdio'),
  command: z
    .string()
    .min(1, 'Command is required')
    .max(500, 'Command must be less than 500 characters'),
  args: z.string().max(2000, 'Arguments must be less than 2000 characters'),
  env: z.string().max(5000, 'Environment variables must be less than 5000 characters'),
})

/**
 * HTTP server configuration schema
 */
export const httpServerSchema = baseServerSchema.extend({
  transport: z.literal('http'),
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL'),
  headers: z.string().max(5000, 'Headers must be less than 5000 characters'),
})

/**
 * Combined server schema (for form validation)
 */
export const serverFormSchema = z.discriminatedUnion('transport', [
  stdioServerSchema,
  httpServerSchema,
])

/**
 * Type for validated stdio server form data
 */
export type StdioServerFormData = z.infer<typeof stdioServerSchema>

/**
 * Type for validated HTTP server form data
 */
export type HttpServerFormData = z.infer<typeof httpServerSchema>

/**
 * Type for validated server form data (union)
 */
export type ServerFormData = z.infer<typeof serverFormSchema>

// ============================================
// API Key Validation Schemas
// ============================================

/**
 * API key schema - validates format without checking the actual key
 */
export const apiKeySchema = z.object({
  googleApiKey: z
    .string()
    .optional()
    .refine(
      val => !val || val.length >= 10,
      'Google API key must be at least 10 characters'
    ),
  groqApiKey: z
    .string()
    .optional()
    .refine(
      val => !val || val.length >= 10,
      'Groq API key must be at least 10 characters'
    ),
  openaiApiKey: z
    .string()
    .optional()
    .refine(
      val => !val || (val.startsWith('sk-') && val.length >= 20),
      'OpenAI API key should start with sk- and be at least 20 characters'
    ),
})

export type ApiKeyFormData = z.infer<typeof apiKeySchema>

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Parse environment variables from string format
 */
export function parseEnvString(envString: string): Record<string, string> {
  const result: Record<string, string> = {}

  if (!envString.trim()) return result

  for (const line of envString.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      result[key.trim()] = valueParts.join('=').trim()
    }
  }

  return result
}

/**
 * Convert environment variables object to string format
 */
export function envToString(env: Record<string, string> | undefined): string {
  if (!env) return ''
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
}

/**
 * Parse arguments string to array
 */
export function parseArgsString(argsString: string): string[] {
  return argsString.split(' ').filter(Boolean)
}

/**
 * Validate and format URL
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    new URL(url)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid URL' }
  }
}

