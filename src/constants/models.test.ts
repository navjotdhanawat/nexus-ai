/**
 * Model Constants Tests
 */

import { describe, it, expect } from 'vitest'
import {
  MODEL_IDS,
  DEFAULT_MODEL_ID,
  MULTIMODAL_MODELS,
  getModelById,
  getModelsByProvider,
  getDefaultModel,
} from './models'

describe('MODEL_IDS', () => {
  it('contains expected model IDs', () => {
    expect(MODEL_IDS.GEMINI_2_FLASH).toBe('gemini-2.0-flash')
    expect(MODEL_IDS.GPT_4O).toBe('gpt-4o')
    expect(MODEL_IDS.LLAMA_3_3_70B).toBe('llama-3.3-70b-versatile')
  })

  it('has all keys as string literals (as const)', () => {
    // Verify that MODEL_IDS is a const object with string values
    expect(typeof MODEL_IDS.GEMINI_2_FLASH).toBe('string')
    expect(typeof MODEL_IDS.GPT_4O).toBe('string')
    // Ensure all values are unique
    const values = Object.values(MODEL_IDS)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })
})

describe('DEFAULT_MODEL_ID', () => {
  it('is a valid model ID', () => {
    expect(DEFAULT_MODEL_ID).toBe(MODEL_IDS.GEMINI_3_PRO)
    expect(getModelById(DEFAULT_MODEL_ID)).toBeDefined()
  })
})

describe('MULTIMODAL_MODELS', () => {
  it('contains models from multiple providers', () => {
    const providers = new Set(MULTIMODAL_MODELS.map(m => m.provider))
    expect(providers.has('google')).toBe(true)
    expect(providers.has('openai')).toBe(true)
    expect(providers.has('groq')).toBe(true)
  })

  it('all models have required fields', () => {
    for (const model of MULTIMODAL_MODELS) {
      expect(model.id).toBeDefined()
      expect(model.name).toBeDefined()
      expect(model.provider).toBeDefined()
      expect(model.capabilities).toBeDefined()
      expect(model.capabilities.inputModalities).toBeDefined()
      expect(model.capabilities.outputModalities).toBeDefined()
    }
  })

  it('has exactly one default model', () => {
    const defaultModels = MULTIMODAL_MODELS.filter(m => m.isDefault)
    expect(defaultModels.length).toBe(1)
  })
})

describe('getModelById', () => {
  it('returns model for valid ID', () => {
    const model = getModelById(MODEL_IDS.GPT_4O)
    expect(model).toBeDefined()
    expect(model?.id).toBe(MODEL_IDS.GPT_4O)
    expect(model?.name).toBe('GPT-4o')
  })

  it('returns undefined for invalid ID', () => {
    const model = getModelById('non-existent-model')
    expect(model).toBeUndefined()
  })
})

describe('getModelsByProvider', () => {
  it('returns Google models', () => {
    const models = getModelsByProvider('google')
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.provider === 'google')).toBe(true)
  })

  it('returns OpenAI models', () => {
    const models = getModelsByProvider('openai')
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.provider === 'openai')).toBe(true)
  })

  it('returns Groq models', () => {
    const models = getModelsByProvider('groq')
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.provider === 'groq')).toBe(true)
  })

  it('returns empty array for unknown provider', () => {
    // @ts-expect-error Testing invalid input
    const models = getModelsByProvider('unknown')
    expect(models).toEqual([])
  })
})

describe('getDefaultModel', () => {
  it('returns the default model', () => {
    const model = getDefaultModel()
    expect(model).toBeDefined()
    expect(model.id).toBe(DEFAULT_MODEL_ID)
  })
})

describe('Model capabilities', () => {
  it('vision models have correct capabilities', () => {
    const visionModels = MULTIMODAL_MODELS.filter(m => m.capabilities.vision)
    expect(visionModels.length).toBeGreaterThan(0)

    for (const model of visionModels) {
      expect(model.capabilities.inputModalities).toContain('image')
      expect(model.capabilities.supportedImageFormats).toBeDefined()
      expect(
        model.capabilities.supportedImageFormats?.length
      ).toBeGreaterThan(0)
    }
  })

  it('image generation models have correct capabilities', () => {
    const imageGenModels = MULTIMODAL_MODELS.filter(
      m => m.capabilities.imageGeneration
    )
    expect(imageGenModels.length).toBeGreaterThan(0)

    for (const model of imageGenModels) {
      expect(model.capabilities.outputModalities).toContain('image')
    }
  })

  it('audio models have correct capabilities', () => {
    const audioModels = MULTIMODAL_MODELS.filter(
      m => m.capabilities.audioTranscription
    )
    expect(audioModels.length).toBeGreaterThan(0)

    for (const model of audioModels) {
      expect(model.capabilities.inputModalities).toContain('audio')
      expect(model.capabilities.supportedAudioFormats).toBeDefined()
    }
  })
})

