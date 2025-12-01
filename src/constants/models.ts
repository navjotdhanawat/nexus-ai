/**
 * Model Constants
 * Centralized model IDs and configurations
 */

import type { MultimodalModelConfig, Provider } from '@/types/multimodal'

// ============================================
// Model IDs - Use these instead of magic strings
// ============================================

export const MODEL_IDS = {
  // Google - Latest (Gemini 3.x)
  GEMINI_3_PRO: 'gemini-3.0-pro',
  GEMINI_3_DEEP_THINK: 'gemini-3.0-deep-think',
  // Google - Gemini 2.5 Series
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image',
  // Google - Gemini 2.0 Series (Legacy)
  GEMINI_2_FLASH: 'gemini-2.0-flash',
  GEMINI_2_FLASH_EXP: 'gemini-2.0-flash-exp',
  // Google - Gemini 1.5 Series (Legacy)
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  // OpenAI
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  DALL_E_3: 'dall-e-3',
  GPT_IMAGE_1: 'gpt-image-1',
  // Groq
  LLAMA_3_3_70B: 'llama-3.3-70b-versatile',
  LLAMA_3_1_8B: 'llama-3.1-8b-instant',
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
  LLAMA_3_2_11B_VISION: 'llama-3.2-11b-vision-preview',
} as const

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS]

// ============================================
// Default Model
// ============================================

export const DEFAULT_MODEL_ID: ModelId = MODEL_IDS.GEMINI_3_PRO

// ============================================
// Provider Labels and Colors
// ============================================

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export const PROVIDER_COLORS: Record<Provider, string> = {
  google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  groq: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  openai: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  anthropic: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
}

// ============================================
// Model Configurations
// ============================================

export const MULTIMODAL_MODELS: MultimodalModelConfig[] = [
  // ============================================
  // Google Gemini 3.x Models (Latest)
  // ============================================
  {
    id: MODEL_IDS.GEMINI_3_PRO,
    name: 'Gemini 3 Pro',
    provider: 'google',
    description: "Google's most advanced AI model with superior reasoning and multimodal capabilities",
    isDefault: true,
    capabilities: {
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 2097152,
      maxOutputTokens: 65536,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  {
    id: MODEL_IDS.GEMINI_3_DEEP_THINK,
    name: 'Gemini 3 Deep Think',
    provider: 'google',
    description: 'Advanced reasoning model for complex problem-solving with chain-of-thought capabilities',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 2097152,
      maxOutputTokens: 65536,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  // ============================================
  // Google Gemini 2.5 Models
  // ============================================
  {
    id: MODEL_IDS.GEMINI_2_5_PRO,
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Enhanced reasoning and coding capabilities with thinking model',
    capabilities: {
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  {
    id: MODEL_IDS.GEMINI_2_5_FLASH,
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast multimodal model with native audio output support',
    capabilities: {
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text', 'audio'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: true,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  {
    id: MODEL_IDS.GEMINI_2_5_FLASH_LITE,
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    description: 'Cost-effective model optimized for high-throughput tasks',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  {
    id: MODEL_IDS.GEMINI_2_5_FLASH_IMAGE,
    name: 'Gemini 2.5 Flash Image',
    provider: 'google',
    description: 'AI-powered image generation and editing with natural language prompts',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'image'],
      streaming: false,
      functionCalling: false,
      vision: true,
      audioTranscription: false,
      imageGeneration: true,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  // ============================================
  // Google Gemini 2.0 Models (Legacy)
  // ============================================
  {
    id: MODEL_IDS.GEMINI_2_FLASH,
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Fast multimodal model with vision and audio support',
    capabilities: {
      inputModalities: ['text', 'image', 'audio'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  {
    id: MODEL_IDS.GEMINI_2_FLASH_EXP,
    name: 'Gemini 2.0 Flash Exp (Image Gen)',
    provider: 'google',
    description: 'Experimental Gemini 2.0 Flash with image generation - creates images from text',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text', 'image'],
      streaming: false,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: true,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  // ============================================
  // Google Gemini 1.5 Models (Legacy)
  // ============================================
  {
    id: MODEL_IDS.GEMINI_1_5_FLASH,
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Balanced multimodal model',
    capabilities: {
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  {
    id: MODEL_IDS.GEMINI_1_5_PRO,
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Capable multimodal model with large context',
    capabilities: {
      inputModalities: ['text', 'image', 'audio', 'video'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: true,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      supportedAudioFormats: ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac'],
      maxImageSize: 20 * 1024 * 1024,
      maxAudioDuration: 9.5 * 60 * 60,
    },
  },
  // ============================================
  // OpenAI Models
  // ============================================
  {
    id: MODEL_IDS.GPT_4O,
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Multimodal model with vision and text',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  {
    id: MODEL_IDS.GPT_4O_MINI,
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable with vision support',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  {
    id: MODEL_IDS.GPT_4_TURBO,
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Powerful model with vision',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  {
    id: MODEL_IDS.DALL_E_3,
    name: 'DALL-E 3',
    provider: 'openai',
    description: "OpenAI's most advanced image generation model",
    capabilities: {
      inputModalities: ['text'],
      outputModalities: ['image'],
      streaming: false,
      functionCalling: false,
      vision: false,
      audioTranscription: false,
      imageGeneration: true,
      audioGeneration: false,
      contextWindow: 4000,
      maxOutputTokens: 0,
      supportedImageFormats: [],
      maxImageSize: 0,
    },
  },
  {
    id: MODEL_IDS.GPT_IMAGE_1,
    name: 'GPT Image 1',
    provider: 'openai',
    description: "OpenAI's latest image generation model",
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['image'],
      streaming: false,
      functionCalling: false,
      vision: true,
      audioTranscription: false,
      imageGeneration: true,
      audioGeneration: false,
      contextWindow: 32000,
      maxOutputTokens: 0,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
  // ============================================
  // Groq Models
  // ============================================
  {
    id: MODEL_IDS.LLAMA_3_3_70B,
    name: 'Llama 3.3 70B',
    provider: 'groq',
    description: 'Fast inference, text-only',
    capabilities: {
      inputModalities: ['text'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: false,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 32768,
    },
  },
  {
    id: MODEL_IDS.LLAMA_3_1_8B,
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    description: 'Ultra-fast text model',
    capabilities: {
      inputModalities: ['text'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: false,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 8192,
    },
  },
  {
    id: MODEL_IDS.MIXTRAL_8X7B,
    name: 'Mixtral 8x7B',
    provider: 'groq',
    description: 'MoE model with large context',
    capabilities: {
      inputModalities: ['text'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: true,
      vision: false,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 32768,
      maxOutputTokens: 32768,
    },
  },
  {
    id: MODEL_IDS.LLAMA_3_2_11B_VISION,
    name: 'Llama 3.2 11B Vision',
    provider: 'groq',
    description: 'Vision-capable Llama model',
    capabilities: {
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      streaming: true,
      functionCalling: false,
      vision: true,
      audioTranscription: false,
      imageGeneration: false,
      audioGeneration: false,
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportedImageFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      maxImageSize: 20 * 1024 * 1024,
    },
  },
]

// ============================================
// Model Lookup Helpers
// ============================================

/** Model lookup map for O(1) access */
const MODEL_MAP = new Map(MULTIMODAL_MODELS.map(m => [m.id, m]))

/** Get model by ID */
export function getModelById(modelId: string): MultimodalModelConfig | undefined {
  return MODEL_MAP.get(modelId)
}

/** Get models by provider */
export function getModelsByProvider(provider: Provider): MultimodalModelConfig[] {
  return MULTIMODAL_MODELS.filter(m => m.provider === provider)
}

/** Get default model for a provider */
export function getDefaultModel(): MultimodalModelConfig {
  const defaultModel = MODEL_MAP.get(DEFAULT_MODEL_ID)
  if (defaultModel) return defaultModel
  const firstModel = MULTIMODAL_MODELS[0]
  if (firstModel) return firstModel
  throw new Error('No models available')
}

