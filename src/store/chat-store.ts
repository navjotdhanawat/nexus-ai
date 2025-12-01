/**
 * Chat Store
 * State management for chat conversations and messages
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  ContentPart,
  Provider,
  MultimodalModelConfig,
} from '@/types/multimodal'
import {
  MULTIMODAL_MODELS,
  extractTextFromContent,
  createTextContent,
  DEFAULT_MODEL_ID,
} from '@/types/multimodal'

// Re-export Provider type for backwards compatibility
export type { Provider } from '@/types/multimodal'

// ============================================
// Types
// ============================================

export interface ModelConfig {
  id: string
  name: string
  provider: Provider
  maxTokens: number
}

// Create ModelConfig from MultimodalModelConfig for backwards compatibility
export const AVAILABLE_MODELS: ModelConfig[] = MULTIMODAL_MODELS.map(m => ({
  id: m.id,
  name: m.name,
  provider: m.provider,
  maxTokens: m.capabilities.maxOutputTokens,
}))

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ToolCallData {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: 'pending' | 'executing' | 'success' | 'error'
  result?: string
}

/**
 * Chat message with multimodal content support
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  /**
   * Message content - can be a string (legacy) or an array of content parts (multimodal)
   * For backwards compatibility, we support both formats
   */
  content: string | ContentPart[]
  timestamp: number
  isStreaming?: boolean
  toolCalls?: ToolCallData[]
  toolCallId?: string
  /** For tool role messages, the name of the tool that was called */
  toolName?: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  systemPrompt: string
  createdAt: number
  updatedAt: number
}

interface ChatSettings {
  temperature: number
  maxTokens: number
  topP: number
}

interface ChatState {
  // Conversations
  conversations: Conversation[]
  activeConversationId: string | null

  // Settings
  selectedModelId: string
  systemPrompt: string
  settings: ChatSettings

  // UI State
  isGenerating: boolean
  error: string | null

  // Actions
  createConversation: () => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void
  updateConversationTitle: (id: string, title: string) => void

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (id: string, content: string | ContentPart[]) => void
  updateMessageToolCalls: (id: string, toolCalls: ToolCallData[]) => void
  updateToolCallStatus: (
    messageId: string,
    toolCallId: string,
    status: ToolCallData['status'],
    result?: string
  ) => void
  setMessageStreaming: (id: string, isStreaming: boolean) => void
  clearMessages: () => void

  setSelectedModel: (modelId: string) => void
  setSystemPrompt: (prompt: string) => void
  setSettings: (settings: Partial<ChatSettings>) => void

  setIsGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
}

// ============================================
// Helpers
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 15)

const createDefaultConversation = (): Conversation => ({
  id: generateId(),
  title: 'New Chat',
  messages: [],
  modelId: DEFAULT_MODEL_ID,
  systemPrompt: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

/**
 * Helper to get text content from a message
 * Handles both string and ContentPart[] formats
 */
export function getMessageText(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content
  }
  return extractTextFromContent(message.content)
}

/**
 * Helper to check if a message has multimodal content (images, audio)
 */
export function hasMultimodalContent(message: ChatMessage): boolean {
  if (typeof message.content === 'string') {
    return false
  }
  return message.content.some(p => p.type === 'image' || p.type === 'audio')
}

/**
 * Helper to get content parts from a message
 * Converts string content to ContentPart[] format
 */
export function getContentParts(message: ChatMessage): ContentPart[] {
  if (typeof message.content === 'string') {
    return message.content ? [createTextContent(message.content)] : []
  }
  return message.content
}

/**
 * Helper to create message content from text and optional attachments
 */
export function createMessageContent(
  text: string,
  attachments?: ContentPart[]
): string | ContentPart[] {
  // If no attachments, return simple string for backwards compatibility
  if (!attachments || attachments.length === 0) {
    return text
  }

  // Build content parts array
  const parts: ContentPart[] = []

  // Add text if present
  if (text.trim()) {
    parts.push(createTextContent(text))
  }

  // Add attachments
  parts.push(...attachments)

  return parts
}

// ============================================
// Store Implementation
// ============================================

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        conversations: [],
        activeConversationId: null,
        selectedModelId: DEFAULT_MODEL_ID,
        systemPrompt: '',
        settings: {
          temperature: 0.7,
          maxTokens: 4096,
          topP: 0.95,
        },
        isGenerating: false,
        error: null,

        // Conversation actions
        createConversation: () => {
          const newConversation = createDefaultConversation()
          newConversation.modelId = get().selectedModelId
          newConversation.systemPrompt = get().systemPrompt

          set(
            state => ({
              conversations: [newConversation, ...state.conversations],
              activeConversationId: newConversation.id,
            }),
            undefined,
            'createConversation'
          )
          return newConversation.id
        },

        deleteConversation: id => {
          set(
            state => {
              const newConversations = state.conversations.filter(
                c => c.id !== id
              )
              const newActiveId =
                state.activeConversationId === id
                  ? newConversations[0]?.id || null
                  : state.activeConversationId

              return {
                conversations: newConversations,
                activeConversationId: newActiveId,
              }
            },
            undefined,
            'deleteConversation'
          )
        },

        setActiveConversation: id => {
          const conversation = get().conversations.find(c => c.id === id)
          if (conversation) {
            set(
              {
                activeConversationId: id,
                selectedModelId: conversation.modelId,
                systemPrompt: conversation.systemPrompt,
              },
              undefined,
              'setActiveConversation'
            )
          } else {
            set(
              { activeConversationId: id },
              undefined,
              'setActiveConversation'
            )
          }
        },

        updateConversationTitle: (id, title) => {
          set(
            state => ({
              conversations: state.conversations.map(c =>
                c.id === id ? { ...c, title, updatedAt: Date.now() } : c
              ),
            }),
            undefined,
            'updateConversationTitle'
          )
        },

        // Message actions
        addMessage: message => {
          const { activeConversationId, createConversation } = get()
          let conversationId = activeConversationId

          // Create new conversation if none exists
          if (!conversationId) {
            conversationId = createConversation()
          }

          const newMessage: ChatMessage = {
            ...message,
            id: generateId(),
            timestamp: Date.now(),
          }

          set(
            state => ({
              conversations: state.conversations.map(c => {
                if (c.id === conversationId) {
                  // Auto-title based on first user message text
                  const messageText = getMessageText({ ...newMessage })
                  const shouldUpdateTitle =
                    c.title === 'New Chat' &&
                    message.role === 'user' &&
                    c.messages.length === 0

                  const newTitle = shouldUpdateTitle
                    ? messageText.slice(0, 50) +
                      (messageText.length > 50 ? '...' : '')
                    : c.title

                  return {
                    ...c,
                    messages: [...c.messages, newMessage],
                    title: newTitle,
                    updatedAt: Date.now(),
                  }
                }
                return c
              }),
            }),
            undefined,
            'addMessage'
          )
        },

        updateMessage: (id, content) => {
          set(
            state => ({
              conversations: state.conversations.map(c => ({
                ...c,
                messages: c.messages.map(m =>
                  m.id === id ? { ...m, content } : m
                ),
                updatedAt: Date.now(),
              })),
            }),
            undefined,
            'updateMessage'
          )
        },

        updateMessageToolCalls: (id, toolCalls) => {
          set(
            state => ({
              conversations: state.conversations.map(c => ({
                ...c,
                messages: c.messages.map(m =>
                  m.id === id ? { ...m, toolCalls } : m
                ),
                updatedAt: Date.now(),
              })),
            }),
            undefined,
            'updateMessageToolCalls'
          )
        },

        updateToolCallStatus: (messageId, toolCallId, status, result) => {
          set(
            state => ({
              conversations: state.conversations.map(c => ({
                ...c,
                messages: c.messages.map(m => {
                  if (m.id !== messageId || !m.toolCalls) return m
                  return {
                    ...m,
                    toolCalls: m.toolCalls.map(tc =>
                      tc.id === toolCallId
                        ? { ...tc, status, result: result ?? tc.result }
                        : tc
                    ),
                  }
                }),
                updatedAt: Date.now(),
              })),
            }),
            undefined,
            'updateToolCallStatus'
          )
        },

        setMessageStreaming: (id, isStreaming) => {
          set(
            state => ({
              conversations: state.conversations.map(c => ({
                ...c,
                messages: c.messages.map(m =>
                  m.id === id ? { ...m, isStreaming } : m
                ),
              })),
            }),
            undefined,
            'setMessageStreaming'
          )
        },

        clearMessages: () => {
          set(
            state => ({
              conversations: state.conversations.map(c =>
                c.id === state.activeConversationId
                  ? { ...c, messages: [], title: 'New Chat', updatedAt: Date.now() }
                  : c
              ),
            }),
            undefined,
            'clearMessages'
          )
        },

        // Settings actions
        setSelectedModel: modelId => {
          set(
            state => {
              // Also update the active conversation's model
              const updatedConversations = state.conversations.map(c =>
                c.id === state.activeConversationId
                  ? { ...c, modelId, updatedAt: Date.now() }
                  : c
              )
              return {
                selectedModelId: modelId,
                conversations: updatedConversations,
              }
            },
            undefined,
            'setSelectedModel'
          )
        },

        setSystemPrompt: prompt => {
          set(
            state => {
              const updatedConversations = state.conversations.map(c =>
                c.id === state.activeConversationId
                  ? { ...c, systemPrompt: prompt, updatedAt: Date.now() }
                  : c
              )
              return {
                systemPrompt: prompt,
                conversations: updatedConversations,
              }
            },
            undefined,
            'setSystemPrompt'
          )
        },

        setSettings: newSettings => {
          set(
            state => ({
              settings: { ...state.settings, ...newSettings },
            }),
            undefined,
            'setSettings'
          )
        },

        // UI State actions
        setIsGenerating: isGenerating => {
          set({ isGenerating }, undefined, 'setIsGenerating')
        },

        setError: error => {
          set({ error }, undefined, 'setError')
        },
      }),
      {
        name: 'chat-store',
        partialize: state => ({
          conversations: state.conversations,
          selectedModelId: state.selectedModelId,
          systemPrompt: state.systemPrompt,
          settings: state.settings,
        }),
      }
    ),
    { name: 'chat-store' }
  )
)

// ============================================
// Selectors
// ============================================

// Stable empty array to prevent re-renders
const EMPTY_MESSAGES: ChatMessage[] = []

export const selectActiveConversation = (state: ChatState) =>
  state.conversations.find(c => c.id === state.activeConversationId)

export const selectActiveMessages = (state: ChatState) => {
  const conversation = selectActiveConversation(state)
  return conversation?.messages ?? EMPTY_MESSAGES
}

export const selectSelectedModel = (state: ChatState) =>
  AVAILABLE_MODELS.find(m => m.id === state.selectedModelId)

/**
 * Get the multimodal model config with full capabilities
 */
export const selectSelectedMultimodalModel = (state: ChatState): MultimodalModelConfig | undefined =>
  MULTIMODAL_MODELS.find(m => m.id === state.selectedModelId)
