/**
 * LLM Service
 * Unified API for multiple LLM providers (Google, OpenAI, Groq)
 */

import { useApiKeysStore } from '@/store/api-keys-store'
import { logger } from '@/lib/logger'
import { parseApiError, AppError, ERROR_CODES } from '@/lib/errors'
import {
  streamGoogleResponse,
  streamOpenAIResponse,
  streamGroqResponse,
} from '@/lib/streaming'
import { getModelById, MULTIMODAL_MODELS } from '@/constants/models'
import type { MCPTool, ToolCall } from '@/types/mcp'
import type { ContentPart, Provider } from '@/types/multimodal'
import { getDataUri, extractTextFromContent } from '@/types/multimodal'
import type { ChatMessage } from '@/store/chat-store'
import { getContentParts } from '@/store/chat-store'

// ============================================
// API Key Getters
// ============================================

const getGoogleApiKey = () => {
  const storeKey = useApiKeysStore.getState().googleApiKey
  if (storeKey) return storeKey
  return import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
}

const getGroqApiKey = () => {
  const storeKey = useApiKeysStore.getState().groqApiKey
  if (storeKey) return storeKey
  return import.meta.env.VITE_GROQ_API_KEY as string | undefined
}

const getOpenaiApiKey = () => {
  const storeKey = useApiKeysStore.getState().openaiApiKey
  if (storeKey) return storeKey
  return import.meta.env.VITE_OPENAI_API_KEY as string | undefined
}

// ============================================
// Request/Response Types
// ============================================

export interface LLMRequestOptions {
  modelId: string
  messages: ChatMessage[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  onChunk?: (chunk: string) => void
  signal?: AbortSignal
  tools?: MCPTool[]
}

export interface LLMResponse {
  content: string
  toolCalls?: ToolCall[]
  finishReason?: string
  generatedImages?: GeneratedImage[]
}

export interface GeneratedImage {
  data: string
  mimeType: string
  revisedPrompt?: string
}

export interface ImageGenerationOptions {
  modelId: string
  prompt: string
  referenceImages?: {
    data: string
    mimeType: string
  }[]
  n?: number
  size?: 'square' | '1024x1024' | '1792x1024' | '1024x1792' | 'auto'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  signal?: AbortSignal
}

// ============================================
// Provider-Specific Message Types
// ============================================

interface GoogleGeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  functionCall?: {
    name: string
    args: Record<string, unknown>
  }
  functionResponse?: {
    name: string
    response: Record<string, unknown>
  }
}

interface GoogleGeminiMessage {
  role: 'user' | 'model'
  parts: GoogleGeminiPart[]
}

interface OpenAIContentPart {
  type: 'text' | 'image_url' | 'input_audio'
  text?: string
  image_url?: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
  input_audio?: {
    data: string
    format: 'wav' | 'mp3'
  }
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | OpenAIContentPart[] | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface GroqMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | GroqContentPart[] | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface GroqContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

// ============================================
// Tool Conversion Utilities
// ============================================

function mcpToolsToGemini(tools: MCPTool[]): object[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }))
}

function mcpToolsToOpenAI(tools: MCPTool[]): object[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }))
}

// ============================================
// Message Conversion Utilities
// ============================================

function contentPartToGemini(part: ContentPart): GoogleGeminiPart | null {
  switch (part.type) {
    case 'text':
      return { text: part.text }
    case 'image':
      if (part.data) {
        return {
          inlineData: {
            mimeType: part.mimeType,
            data: part.data,
          },
        }
      }
      return null
    case 'audio':
      if (part.data) {
        return {
          inlineData: {
            mimeType: part.mimeType,
            data: part.data,
          },
        }
      }
      return null
    case 'file':
      return null
    default:
      return null
  }
}

function contentPartToOpenAI(part: ContentPart): OpenAIContentPart | null {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text }
    case 'image':
      if (part.data) {
        return {
          type: 'image_url',
          image_url: {
            url: getDataUri(part.data, part.mimeType),
            detail: 'auto',
          },
        }
      } else if (part.url) {
        return {
          type: 'image_url',
          image_url: {
            url: part.url,
            detail: 'auto',
          },
        }
      }
      return null
    case 'audio':
      if (part.data) {
        const format = part.mimeType.includes('wav') ? 'wav' : 'mp3'
        return {
          type: 'input_audio',
          input_audio: {
            data: part.data,
            format,
          },
        }
      }
      return null
    default:
      return null
  }
}

function contentPartToGroq(part: ContentPart): GroqContentPart | null {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text }
    case 'image':
      if (part.data) {
        return {
          type: 'image_url',
          image_url: {
            url: getDataUri(part.data, part.mimeType),
          },
        }
      } else if (part.url) {
        return {
          type: 'image_url',
          image_url: {
            url: part.url,
          },
        }
      }
      return null
    default:
      return null
  }
}

function chatMessageToGemini(message: ChatMessage): GoogleGeminiMessage | null {
  if (message.role === 'system') return null

  // Handle tool result messages - convert to functionResponse
  if (message.role === 'tool') {
    if (!message.toolName) return null
    const parts = getContentParts(message)
    const textContent = extractTextFromContent(parts)
    
    // Try to parse as JSON for structured response
    let responseData: Record<string, unknown>
    try {
      responseData = JSON.parse(textContent)
    } catch {
      responseData = { result: textContent }
    }
    
    return {
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: message.toolName,
            response: responseData,
          },
        },
      ],
    }
  }

  const parts = getContentParts(message)
  const geminiParts = parts
    .map(contentPartToGemini)
    .filter((p): p is GoogleGeminiPart => p !== null)

  // For assistant messages with tool calls, add functionCall parts
  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    for (const tc of message.toolCalls) {
      geminiParts.push({
        functionCall: {
          name: tc.name,
          args: tc.arguments,
        },
      })
    }
  }

  if (geminiParts.length === 0) return null

  return {
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: geminiParts,
  }
}

function chatMessageToOpenAI(message: ChatMessage): OpenAIMessage | null {
  const parts = getContentParts(message)

  if (message.role === 'system') {
    return {
      role: 'system',
      content: extractTextFromContent(parts),
    }
  }

  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: extractTextFromContent(parts),
      tool_call_id: message.toolCallId,
    }
  }

  const hasNonText = parts.some(p => p.type !== 'text')

  if (!hasNonText) {
    return {
      role: message.role as 'user' | 'assistant',
      content: extractTextFromContent(parts),
    }
  }

  const openaiParts = parts
    .map(contentPartToOpenAI)
    .filter((p): p is OpenAIContentPart => p !== null)

  return {
    role: message.role as 'user' | 'assistant',
    content: openaiParts,
  }
}

function chatMessageToGroq(message: ChatMessage): GroqMessage | null {
  const parts = getContentParts(message)

  if (message.role === 'system') {
    return {
      role: 'system',
      content: extractTextFromContent(parts),
    }
  }

  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: extractTextFromContent(parts),
      tool_call_id: message.toolCallId,
    }
  }

  const hasImages = parts.some(p => p.type === 'image')
  const hasAudio = parts.some(p => p.type === 'audio')

  if (hasAudio && !hasImages) {
    return {
      role: message.role as 'user' | 'assistant',
      content: extractTextFromContent(parts),
    }
  }

  if (!hasImages) {
    return {
      role: message.role as 'user' | 'assistant',
      content: extractTextFromContent(parts),
    }
  }

  const groqParts = parts
    .filter(p => p.type === 'text' || p.type === 'image')
    .map(contentPartToGroq)
    .filter((p): p is GroqContentPart => p !== null)

  return {
    role: message.role as 'user' | 'assistant',
    content: groqParts,
  }
}

// ============================================
// Main API Functions
// ============================================

export async function sendChatRequest(
  options: LLMRequestOptions
): Promise<string> {
  const response = await sendChatRequestWithTools(options)
  return response.content
}

export async function sendChatRequestWithTools(
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const {
    modelId,
    messages,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 4096,
    topP = 0.95,
    onChunk,
    signal,
    tools,
  } = options

  const model = getModelById(modelId)
  if (!model) {
    throw new AppError(
      `Unknown model: ${modelId}`,
      ERROR_CODES.API_NOT_FOUND,
      `Model "${modelId}" not found.`
    )
  }

  logger.info(`Sending chat request to ${model.provider}/${modelId}`, {
    hasTools: !!tools?.length,
    toolCount: tools?.length || 0,
    messageCount: messages.length,
  })

  const requestOptions = {
    modelId,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    onChunk,
    signal,
    tools,
  }

  switch (model.provider) {
    case 'google':
      return sendGoogleRequest(requestOptions)
    case 'openai':
      return sendOpenAIRequest(requestOptions)
    case 'groq':
      return sendGroqRequest(requestOptions)
    default:
      throw new AppError(
        `Unsupported provider: ${model.provider}`,
        ERROR_CODES.API_UNKNOWN,
        `Provider "${model.provider}" is not supported.`
      )
  }
}

// ============================================
// Google Gemini API
// ============================================

async function sendGoogleRequest(
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const {
    modelId,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    onChunk,
    signal,
    tools,
  } = options

  const apiKey = getGoogleApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'Google' })
  }

  const geminiMessages: GoogleGeminiMessage[] = messages
    .map(chatMessageToGemini)
    .filter((m): m is GoogleGeminiMessage => m !== null)

  const useStreaming = onChunk && (!tools || tools.length === 0)

  const endpoint = useStreaming
    ? `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const body: Record<string, unknown> = {
    contents: geminiMessages,
    systemInstruction: systemPrompt
      ? { parts: [{ text: systemPrompt }] }
      : undefined,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP,
    },
  }

  if (tools && tools.length > 0) {
    body.tools = [{ functionDeclarations: mcpToolsToGemini(tools) }]
    body.toolConfig = {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Google API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'Google')
  }

  if (useStreaming && response.body && onChunk) {
    const content = await streamGoogleResponse(response.body, onChunk)
    return { content }
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts || []

  const toolCalls: ToolCall[] = []
  let textContent = ''

  for (const part of parts) {
    if (part.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      })
    }
    if (part.text) {
      textContent += part.text
    }
  }

  if (onChunk && textContent) {
    onChunk(textContent)
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    finishReason: candidate?.finishReason,
  }
}

// ============================================
// OpenAI API
// ============================================

async function sendOpenAIRequest(
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const {
    modelId,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    onChunk,
    signal,
    tools,
  } = options

  const apiKey = getOpenaiApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'OpenAI' })
  }

  const openaiMessages: OpenAIMessage[] = []

  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt })
  }

  for (const msg of messages) {
    const converted = chatMessageToOpenAI(msg)
    if (converted) {
      openaiMessages.push(converted)
    }
  }

  const useStreaming = onChunk && (!tools || tools.length === 0)

  const body: Record<string, unknown> = {
    model: modelId,
    messages: openaiMessages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    stream: useStreaming,
  }

  if (tools && tools.length > 0) {
    body.tools = mcpToolsToOpenAI(tools)
    body.tool_choice = 'auto'
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`OpenAI API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'OpenAI')
  }

  if (useStreaming && response.body && onChunk) {
    const content = await streamOpenAIResponse(response.body, onChunk)
    return { content }
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const message = choice?.message

  const toolCalls: ToolCall[] = []

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })
    }
  }

  const textContent = message?.content || ''

  if (onChunk && textContent) {
    onChunk(textContent)
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    finishReason: choice?.finish_reason,
  }
}

// ============================================
// Groq API
// ============================================

async function sendGroqRequest(
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const {
    modelId,
    messages,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    onChunk,
    signal,
    tools,
  } = options

  const apiKey = getGroqApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'Groq' })
  }

  const model = getModelById(modelId)
  const isVisionModel = model?.capabilities.vision ?? false

  const groqMessages: GroqMessage[] = []

  if (systemPrompt) {
    groqMessages.push({ role: 'system', content: systemPrompt })
  }

  for (const msg of messages) {
    const converted = chatMessageToGroq(msg)
    if (converted) {
      groqMessages.push(converted)
    }
  }

  const useTools = tools && tools.length > 0 && !isVisionModel
  const useStreaming = onChunk && !useTools

  const body: Record<string, unknown> = {
    model: modelId,
    messages: groqMessages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    stream: useStreaming,
  }

  if (useTools && tools) {
    body.tools = mcpToolsToOpenAI(tools)
    body.tool_choice = 'auto'
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Groq API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'Groq')
  }

  if (useStreaming && response.body && onChunk) {
    const content = await streamGroqResponse(response.body, onChunk)
    return { content }
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const message = choice?.message

  const toolCalls: ToolCall[] = []

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })
    }
  }

  const textContent = message?.content || ''

  if (onChunk && textContent) {
    onChunk(textContent)
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    finishReason: choice?.finish_reason,
  }
}

// ============================================
// Provider Configuration Helpers
// ============================================

export function getConfiguredProviders(): Provider[] {
  const providers: Provider[] = []
  if (getGoogleApiKey()) providers.push('google')
  if (getGroqApiKey()) providers.push('groq')
  if (getOpenaiApiKey()) providers.push('openai')
  return providers
}

export function getAvailableModels() {
  const configuredProviders = getConfiguredProviders()
  return MULTIMODAL_MODELS.filter(m => configuredProviders.includes(m.provider))
}

export function getModelsWithCapability(capability: 'vision' | 'audio') {
  const configuredProviders = getConfiguredProviders()
  return MULTIMODAL_MODELS.filter(
    m =>
      configuredProviders.includes(m.provider) &&
      (capability === 'vision'
        ? m.capabilities.vision
        : m.capabilities.audioTranscription)
  )
}

export function getImageGenerationModels() {
  const configuredProviders = getConfiguredProviders()
  return MULTIMODAL_MODELS.filter(
    m => configuredProviders.includes(m.provider) && m.capabilities.imageGeneration
  )
}

// ============================================
// Image Generation API
// ============================================

export async function generateImage(
  options: ImageGenerationOptions
): Promise<GeneratedImage[]> {
  const { modelId, signal } = options

  const model = getModelById(modelId)
  if (!model) {
    throw new AppError(
      `Unknown model: ${modelId}`,
      ERROR_CODES.API_NOT_FOUND,
      `Model "${modelId}" not found.`
    )
  }

  if (!model.capabilities.imageGeneration) {
    throw new AppError(
      `Model ${modelId} does not support image generation`,
      ERROR_CODES.API_BAD_REQUEST,
      `Model "${model.name}" does not support image generation.`
    )
  }

  logger.info(`Generating image with ${model.provider}/${modelId}`, {
    promptLength: options.prompt.length,
    hasReferenceImages: !!options.referenceImages?.length,
  })

  switch (model.provider) {
    case 'google':
      return generateGoogleImage(options, signal)
    case 'openai':
      return generateOpenAIImage(options, signal)
    default:
      throw new AppError(
        `Image generation not supported for provider: ${model.provider}`,
        ERROR_CODES.API_BAD_REQUEST,
        `Image generation is not supported for ${model.provider}.`
      )
  }
}

// ============================================
// Google Gemini Image Generation
// ============================================

async function generateGoogleImage(
  options: ImageGenerationOptions,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const { modelId, prompt, referenceImages } = options

  const apiKey = getGoogleApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'Google' })
  }

  const parts: GoogleGeminiPart[] = []

  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      })
    }
  }

  parts.push({ text: prompt })

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const body = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Google Image Generation API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'Google Image Generation')
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  const responseParts = candidate?.content?.parts || []

  const images: GeneratedImage[] = []

  for (const part of responseParts) {
    if (part.inlineData) {
      images.push({
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      })
    }
  }

  if (images.length === 0) {
    const textResponse = responseParts.find((p: GoogleGeminiPart) => p.text)
    if (textResponse?.text) {
      throw new AppError(
        `Image generation failed: ${textResponse.text}`,
        ERROR_CODES.API_BAD_REQUEST,
        textResponse.text
      )
    }
    throw new AppError(
      'No images were generated',
      ERROR_CODES.API_UNKNOWN,
      'No images were generated. Please try a different prompt.'
    )
  }

  return images
}

// ============================================
// OpenAI Image Generation
// ============================================

async function generateOpenAIImage(
  options: ImageGenerationOptions,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const {
    modelId,
    prompt,
    referenceImages,
    n = 1,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
  } = options

  const apiKey = getOpenaiApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'OpenAI' })
  }

  const isDallE3 = modelId === 'dall-e-3'
  const isGptImage = modelId === 'gpt-image-1'

  if (referenceImages && referenceImages.length > 0 && !isGptImage) {
    return generateOpenAIImageEdit(options, signal)
  }

  const sizeMap: Record<string, string> = {
    square: '1024x1024',
    '1024x1024': '1024x1024',
    '1792x1024': '1792x1024',
    '1024x1792': '1024x1792',
    auto: '1024x1024',
  }

  const endpoint = 'https://api.openai.com/v1/images/generations'

  const body: Record<string, unknown> = {
    model: modelId,
    prompt,
    n: isDallE3 ? 1 : n,
    size: sizeMap[size] || '1024x1024',
    response_format: 'b64_json',
  }

  if (isDallE3) {
    body.quality = quality
    body.style = style
  }

  if (isGptImage && referenceImages && referenceImages.length > 0) {
    return generateOpenAIImageEdit(options, signal)
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`OpenAI Image Generation API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'OpenAI Image Generation')
  }

  const data = await response.json()

  const images: GeneratedImage[] = (data.data || []).map(
    (item: { b64_json?: string; url?: string; revised_prompt?: string }) => ({
      data: item.b64_json || '',
      mimeType: 'image/png',
      revisedPrompt: item.revised_prompt,
    })
  )

  if (images.length === 0) {
    throw new AppError(
      'No images were generated',
      ERROR_CODES.API_UNKNOWN,
      'No images were generated. Please try a different prompt.'
    )
  }

  return images
}

async function generateOpenAIImageEdit(
  options: ImageGenerationOptions,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const { prompt, referenceImages, n = 1 } = options

  const apiKey = getOpenaiApiKey()
  if (!apiKey) {
    throw AppError.fromCode(ERROR_CODES.API_KEY_MISSING, { provider: 'OpenAI' })
  }

  if (!referenceImages || referenceImages.length === 0) {
    throw new AppError(
      'Reference images required for image editing',
      ERROR_CODES.API_BAD_REQUEST,
      'Please provide a reference image for editing.'
    )
  }

  const firstImage = referenceImages[0]
  if (!firstImage) {
    throw new AppError(
      'Reference image data is missing',
      ERROR_CODES.API_BAD_REQUEST,
      'Reference image data is missing.'
    )
  }

  const imageBlob = base64ToBlob(firstImage.data, firstImage.mimeType)

  const formData = new FormData()
  formData.append('image', imageBlob, 'image.png')
  formData.append('prompt', prompt)
  formData.append('n', String(n))
  formData.append('size', '1024x1024')
  formData.append('response_format', 'b64_json')

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`OpenAI Image Edit API error: ${errorText}`)
    throw parseApiError(errorText, response.status, 'OpenAI Image Edit')
  }

  const data = await response.json()

  const images: GeneratedImage[] = (data.data || []).map(
    (item: { b64_json?: string; url?: string }) => ({
      data: item.b64_json || '',
      mimeType: 'image/png',
    })
  )

  return images
}

// ============================================
// Helper Functions
// ============================================

function base64ToBlob(base64: string, mimeType: string): Blob {
  let base64Data = base64
  if (base64.includes(',')) {
    const parts = base64.split(',')
    base64Data = parts[1] ?? parts[0] ?? base64
  }
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}
