/**
 * Multimodal Content Types
 * Supports text, image, and audio content for chat messages
 */

// ============================================
// Content Part Types
// ============================================

/**
 * Text content part
 */
export interface TextContentPart {
  type: 'text'
  text: string
}

/**
 * Image content part
 * Supports base64 encoded images or URLs
 */
export interface ImageContentPart {
  type: 'image'
  /** Base64 encoded image data (with or without data URI prefix) */
  data?: string
  /** URL to the image (for external images) */
  url?: string
  /** MIME type of the image (e.g., 'image/png', 'image/jpeg') */
  mimeType: string
  /** Optional alt text for accessibility */
  alt?: string
  /** Original filename if uploaded */
  filename?: string
  /** Width in pixels (if known) */
  width?: number
  /** Height in pixels (if known) */
  height?: number
}

/**
 * Audio content part
 * Supports base64 encoded audio or blob URLs
 */
export interface AudioContentPart {
  type: 'audio'
  /** Base64 encoded audio data */
  data?: string
  /** Blob URL for playback */
  blobUrl?: string
  /** MIME type of the audio (e.g., 'audio/wav', 'audio/mp3', 'audio/webm') */
  mimeType: string
  /** Duration in seconds (if known) */
  duration?: number
  /** Original filename if uploaded */
  filename?: string
  /** Transcription of the audio (if available) */
  transcription?: string
}

/**
 * File content part (for general file attachments)
 */
export interface FileContentPart {
  type: 'file'
  /** Base64 encoded file data */
  data: string
  /** MIME type of the file */
  mimeType: string
  /** Original filename */
  filename: string
  /** File size in bytes */
  size?: number
}

/**
 * Union type for all content parts
 */
export type ContentPart =
  | TextContentPart
  | ImageContentPart
  | AudioContentPart
  | FileContentPart

// ============================================
// Model Capability Types
// ============================================

/**
 * Input modalities a model supports
 */
export type InputModality = 'text' | 'image' | 'audio' | 'video' | 'file'

/**
 * Output modalities a model supports
 */
export type OutputModality = 'text' | 'image' | 'audio'

/**
 * Model capabilities for multimodal support
 */
export interface ModelCapabilities {
  /** Supported input modalities */
  inputModalities: InputModality[]
  /** Supported output modalities */
  outputModalities: OutputModality[]
  /** Whether the model supports streaming */
  streaming: boolean
  /** Whether the model supports function/tool calling */
  functionCalling: boolean
  /** Whether the model supports vision (image understanding) */
  vision: boolean
  /** Whether the model supports audio transcription */
  audioTranscription: boolean
  /** Whether the model can generate images */
  imageGeneration: boolean
  /** Whether the model can generate audio/speech */
  audioGeneration: boolean
  /** Maximum context window in tokens */
  contextWindow: number
  /** Maximum output tokens */
  maxOutputTokens: number
  /** Supported image formats for input */
  supportedImageFormats?: string[]
  /** Supported audio formats for input */
  supportedAudioFormats?: string[]
  /** Maximum image size in bytes */
  maxImageSize?: number
  /** Maximum audio duration in seconds */
  maxAudioDuration?: number
}

// ============================================
// Provider Types
// ============================================

export type Provider = 'google' | 'groq' | 'openai' | 'anthropic'

/**
 * Extended model configuration with capabilities
 */
export interface MultimodalModelConfig {
  id: string
  name: string
  provider: Provider
  capabilities: ModelCapabilities
  /** Whether this is a default/recommended model */
  isDefault?: boolean
  /** Model description for UI */
  description?: string
}

// ============================================
// Re-export constants for convenience
// These are re-exported from constants/models.ts
// ============================================

export {
  MULTIMODAL_MODELS,
  MODEL_IDS,
  DEFAULT_MODEL_ID,
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  getModelById,
  getModelsByProvider,
  getDefaultModel,
  type ModelId,
} from '@/constants/models'

// ============================================
// Helper Functions
// ============================================

import {
  MULTIMODAL_MODELS as MODELS,
  getModelById as getModel,
} from '@/constants/models'

/** Default max image size (20MB) */
const DEFAULT_MAX_IMAGE_SIZE = 20 * 1024 * 1024

/** Default max audio duration (10 minutes) */
const DEFAULT_MAX_AUDIO_DURATION = 600

/**
 * Get models that support a specific input modality
 */
export function getModelsWithInputSupport(modality: InputModality): MultimodalModelConfig[] {
  return MODELS.filter(m => m.capabilities.inputModalities.includes(modality))
}

/**
 * Check if a model supports a specific input modality
 */
export function modelSupportsInput(modelId: string, modality: InputModality): boolean {
  const model = getModel(modelId)
  return model?.capabilities.inputModalities.includes(modality) ?? false
}

/**
 * Check if a model supports vision (image input)
 */
export function modelSupportsVision(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.capabilities.vision ?? false
}

/**
 * Check if a model supports audio input
 */
export function modelSupportsAudio(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.capabilities.audioTranscription ?? false
}

/**
 * Check if a model supports image generation (output)
 */
export function modelSupportsImageGeneration(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.capabilities.imageGeneration ?? false
}

/**
 * Get all models that support image generation
 */
export function getImageGenerationModels(): MultimodalModelConfig[] {
  return MODELS.filter(m => m.capabilities.imageGeneration)
}

/**
 * Check if a model is image-generation only (no text output)
 */
export function isImageGenerationOnlyModel(modelId: string): boolean {
  const model = getModel(modelId)
  if (!model) return false
  return (
    model.capabilities.imageGeneration &&
    !model.capabilities.outputModalities.includes('text')
  )
}

/**
 * Get the maximum image size for a model (in bytes)
 */
export function getMaxImageSize(modelId: string): number {
  const model = getModel(modelId)
  return model?.capabilities.maxImageSize ?? DEFAULT_MAX_IMAGE_SIZE
}

/**
 * Get the maximum audio duration for a model (in seconds)
 */
export function getMaxAudioDuration(modelId: string): number {
  const model = getModel(modelId)
  return model?.capabilities.maxAudioDuration ?? DEFAULT_MAX_AUDIO_DURATION
}

/**
 * Check if a file type is supported by a model
 */
export function isImageTypeSupported(modelId: string, mimeType: string): boolean {
  const model = getModel(modelId)
  if (!model?.capabilities.supportedImageFormats) return false
  return model.capabilities.supportedImageFormats.includes(mimeType)
}

/**
 * Check if an audio type is supported by a model
 */
export function isAudioTypeSupported(modelId: string, mimeType: string): boolean {
  const model = getModel(modelId)
  if (!model?.capabilities.supportedAudioFormats) return false
  return model.capabilities.supportedAudioFormats.includes(mimeType)
}

// ============================================
// Content Conversion Utilities
// ============================================

/**
 * Convert a File to ImageContentPart
 */
export async function fileToImageContent(file: File): Promise<ImageContentPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Extract base64 data (remove data URI prefix if present)
      const base64Data = result.includes(',') ? result.split(',')[1] : result
      resolve({
        type: 'image',
        data: base64Data,
        mimeType: file.type,
        filename: file.name,
      })
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a File to AudioContentPart
 */
export async function fileToAudioContent(file: File): Promise<AudioContentPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.includes(',') ? result.split(',')[1] : result
      resolve({
        type: 'audio',
        data: base64Data,
        mimeType: file.type,
        filename: file.name,
        blobUrl: URL.createObjectURL(file),
      })
    }
    reader.onerror = () => reject(new Error('Failed to read audio file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a Blob (from audio recording) to AudioContentPart
 */
export async function blobToAudioContent(blob: Blob, duration?: number): Promise<AudioContentPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.includes(',') ? result.split(',')[1] : result
      resolve({
        type: 'audio',
        data: base64Data,
        mimeType: blob.type || 'audio/webm',
        blobUrl: URL.createObjectURL(blob),
        duration,
      })
    }
    reader.onerror = () => reject(new Error('Failed to read audio blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Create a text content part
 */
export function createTextContent(text: string): TextContentPart {
  return { type: 'text', text }
}

/**
 * Extract text from content parts
 */
export function extractTextFromContent(parts: ContentPart[]): string {
  return parts
    .filter((p): p is TextContentPart => p.type === 'text')
    .map(p => p.text)
    .join('\n')
}

/**
 * Check if content parts contain only text
 */
export function isTextOnlyContent(parts: ContentPart[]): boolean {
  return parts.every(p => p.type === 'text')
}

/**
 * Get data URI from base64 data and mime type
 */
export function getDataUri(data: string, mimeType: string): string {
  if (data.startsWith('data:')) return data
  return `data:${mimeType};base64,${data}`
}
