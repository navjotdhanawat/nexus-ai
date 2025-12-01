/**
 * Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  stdioServerSchema,
  httpServerSchema,
  parseEnvString,
  envToString,
  parseArgsString,
  validateUrl,
} from './validation'

describe('stdioServerSchema', () => {
  it('validates valid stdio server config', () => {
    const result = stdioServerSchema.safeParse({
      transport: 'stdio',
      name: 'Test Server',
      command: 'uvx',
      args: 'cli-mcp-server',
      env: 'KEY=value',
    })

    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = stdioServerSchema.safeParse({
      transport: 'stdio',
      name: '',
      command: 'uvx',
      args: '',
      env: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find(e =>
        e.path.some(p => p === 'name')
      )
      expect(nameError).toBeDefined()
    }
  })

  it('rejects missing command', () => {
    const result = stdioServerSchema.safeParse({
      transport: 'stdio',
      name: 'Test',
      command: '',
      args: '',
      env: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const commandError = result.error.issues.find(e =>
        e.path.some(p => p === 'command')
      )
      expect(commandError).toBeDefined()
    }
  })

  it('rejects name that is too long', () => {
    const result = stdioServerSchema.safeParse({
      transport: 'stdio',
      name: 'A'.repeat(101),
      command: 'uvx',
      args: '',
      env: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('httpServerSchema', () => {
  it('validates valid HTTP server config', () => {
    const result = httpServerSchema.safeParse({
      transport: 'http',
      name: 'Test Server',
      url: 'https://example.com/mcp',
      headers: 'KEY=value',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid URL', () => {
    const result = httpServerSchema.safeParse({
      transport: 'http',
      name: 'Test',
      url: 'not-a-url',
      headers: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const urlError = result.error.issues.find(e =>
        e.path.some(p => p === 'url')
      )
      expect(urlError).toBeDefined()
    }
  })

  it('rejects missing URL', () => {
    const result = httpServerSchema.safeParse({
      transport: 'http',
      name: 'Test',
      url: '',
      headers: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('parseEnvString', () => {
  it('parses single key-value pair', () => {
    const result = parseEnvString('KEY=value')
    expect(result).toEqual({ KEY: 'value' })
  })

  it('parses multiple key-value pairs', () => {
    const result = parseEnvString('KEY1=value1\nKEY2=value2')
    expect(result).toEqual({
      KEY1: 'value1',
      KEY2: 'value2',
    })
  })

  it('handles values with equals signs', () => {
    const result = parseEnvString('KEY=value=with=equals')
    expect(result).toEqual({ KEY: 'value=with=equals' })
  })

  it('ignores comments', () => {
    const result = parseEnvString('# Comment\nKEY=value')
    expect(result).toEqual({ KEY: 'value' })
  })

  it('ignores empty lines', () => {
    const result = parseEnvString('KEY1=value1\n\nKEY2=value2')
    expect(result).toEqual({
      KEY1: 'value1',
      KEY2: 'value2',
    })
  })

  it('returns empty object for empty string', () => {
    expect(parseEnvString('')).toEqual({})
    expect(parseEnvString('  ')).toEqual({})
  })

  it('trims whitespace', () => {
    const result = parseEnvString('  KEY = value  ')
    expect(result).toEqual({ KEY: 'value' })
  })
})

describe('envToString', () => {
  it('converts object to env string format', () => {
    const result = envToString({ KEY1: 'value1', KEY2: 'value2' })
    expect(result).toBe('KEY1=value1\nKEY2=value2')
  })

  it('handles empty object', () => {
    expect(envToString({})).toBe('')
  })

  it('handles undefined', () => {
    expect(envToString(undefined)).toBe('')
  })
})

describe('parseArgsString', () => {
  it('parses space-separated arguments', () => {
    const result = parseArgsString('arg1 arg2 arg3')
    expect(result).toEqual(['arg1', 'arg2', 'arg3'])
  })

  it('handles multiple spaces', () => {
    const result = parseArgsString('arg1  arg2   arg3')
    expect(result).toEqual(['arg1', 'arg2', 'arg3'])
  })

  it('returns empty array for empty string', () => {
    expect(parseArgsString('')).toEqual([])
    expect(parseArgsString('   ')).toEqual([])
  })
})

describe('validateUrl', () => {
  it('validates valid URL', () => {
    const result = validateUrl('https://example.com')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('validates URL with path', () => {
    const result = validateUrl('https://example.com/api/v1')
    expect(result.valid).toBe(true)
  })

  it('rejects invalid URL', () => {
    const result = validateUrl('not-a-url')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects empty string', () => {
    const result = validateUrl('')
    expect(result.valid).toBe(false)
  })
})
