/**
 * Chat Actions Hook
 * Extracts chat action logic from ChatPlayground for reusability and testing
 */

import { useCallback, useRef } from 'react'
import { useChatStore, selectActiveMessages, type ToolCallData } from '@/store/chat-store'
import { useMCPStore } from '@/store/mcp-store'
import { sendChatRequestWithTools, generateImage } from '@/services/llm'
import { callTool, findToolServer } from '@/services/mcp'
import { logger } from '@/lib/logger'
import { handleError, isAbortError } from '@/lib/errors'
import { MULTIMODAL_MODELS } from '@/constants/models'
import type { MCPTool, ToolCall } from '@/types/mcp'
import type { ContentPart, ImageContentPart } from '@/types/multimodal'

// ============================================
// Types
// ============================================

export interface UseChatActionsOptions {
  onError?: (error: string) => void
}

export interface UseChatActionsReturn {
  /** Send a message (handles both chat and image generation) */
  sendMessage: (content: string | ContentPart[]) => Promise<void>
  /** Stop the current generation */
  stopGeneration: () => void
  /** Regenerate the last assistant response */
  regenerateLastResponse: () => Promise<void>
  /** Whether a generation is currently in progress */
  isGenerating: boolean
  /** Ref to the abort controller */
  abortControllerRef: React.MutableRefObject<AbortController | null>
}

// ============================================
// Hook Implementation
// ============================================

export function useChatActions(
  options: UseChatActionsOptions = {}
): UseChatActionsReturn {
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store selectors
  const isGenerating = useChatStore(state => state.isGenerating)

  // Get available tools from MCP servers
  const getAvailableTools = useCallback((): MCPTool[] => {
    const { servers, serverStates } = useMCPStore.getState()
    const tools: MCPTool[] = []
    
    for (const server of servers) {
      if (!server.enabled) continue
      const state = serverStates.get(server.id)
      if (state?.status === 'connected' && state.tools) {
        tools.push(...state.tools)
      }
    }
    
    return tools
  }, [])

  // Execute tool calls
  const executeToolCalls = useCallback(
    async (
      messageId: string,
      toolCalls: ToolCall[]
    ): Promise<{ id: string; name: string; result: string }[]> => {
      const results: { id: string; name: string; result: string }[] = []
      const { updateToolCallStatus } = useChatStore.getState()

      for (const tc of toolCalls) {
        updateToolCallStatus(messageId, tc.id, 'executing')

        const serverId = findToolServer(tc.name)
        if (!serverId) {
          const errorResult = `Error: Tool "${tc.name}" not found in any connected MCP server`
          updateToolCallStatus(messageId, tc.id, 'error', errorResult)
          results.push({ id: tc.id, name: tc.name, result: errorResult })
          continue
        }

        try {
          const result = await callTool(serverId, tc.name, tc.arguments)
          const resultText = result.content
            .map(c => c.text || JSON.stringify(c))
            .join('\n')

          updateToolCallStatus(
            messageId,
            tc.id,
            result.isError ? 'error' : 'success',
            resultText
          )
          results.push({ id: tc.id, name: tc.name, result: resultText })
        } catch (err) {
          const errorResult = handleError(err, `Tool ${tc.name}`)
          updateToolCallStatus(messageId, tc.id, 'error', errorResult)
          results.push({ id: tc.id, name: tc.name, result: errorResult })
        }
      }

      return results
    },
    []
  )

  // Handle image generation
  const handleImageGeneration = useCallback(
    async (
      content: string | ContentPart[],
      assistantMessageId: string,
      modelId: string,
      signal: AbortSignal
    ) => {
      const { updateMessage, setMessageStreaming } = useChatStore.getState()

      // Extract prompt text and any reference images
      let promptText = ''
      const referenceImages: { data: string; mimeType: string }[] = []

      if (typeof content === 'string') {
        promptText = content
      } else {
        for (const part of content) {
          if (part.type === 'text') {
            promptText += part.text + ' '
          } else if (part.type === 'image' && part.data) {
            referenceImages.push({
              data: part.data,
              mimeType: part.mimeType,
            })
          }
        }
        promptText = promptText.trim()
      }

      // Update message to show generating
      updateMessage(assistantMessageId, '🎨 Generating image...')

      const images = await generateImage({
        modelId,
        prompt: promptText,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        signal,
      })

      // Build response content with generated images
      const responseContent: ContentPart[] = []

      if (images.length > 0) {
        responseContent.push({
          type: 'text',
          text: `Here's the generated image for: "${promptText}"`,
        })

        for (const img of images) {
          const imagePart: ImageContentPart = {
            type: 'image',
            data: img.data,
            mimeType: img.mimeType,
          }
          responseContent.push(imagePart)

          if (img.revisedPrompt) {
            responseContent.push({
              type: 'text',
              text: `*Revised prompt: ${img.revisedPrompt}*`,
            })
          }
        }
      }

      updateMessage(assistantMessageId, responseContent)
      setMessageStreaming(assistantMessageId, false)
    },
    []
  )

  // Handle chat completion with tools
  const handleChatCompletion = useCallback(
    async (
      assistantMessageId: string,
      selectedModelId: string,
      systemPrompt: string,
      settings: { temperature: number; maxTokens: number; topP: number }
    ) => {
      const {
        addMessage,
        updateMessage,
        updateMessageToolCalls,
        setMessageStreaming,
      } = useChatStore.getState()

      const tools = getAvailableTools()

      // Build system prompt with tool awareness
      let enhancedSystemPrompt = systemPrompt
      if (tools.length > 0) {
        const toolInfo = tools
          .map(t => `- ${t.name}: ${t.description}`)
          .join('\n')
        enhancedSystemPrompt = `${systemPrompt || 'You are a helpful assistant.'}\n\nYou have access to the following tools:\n${toolInfo}\n\nUse these tools when appropriate to help answer the user's questions.`
      }

      let currentMessages = selectActiveMessages(useChatStore.getState())
      let currentAssistantId = assistantMessageId
      let continueLoop = true
      let iterations = 0
      const maxIterations = 10

      while (continueLoop && iterations < maxIterations) {
        iterations++
        let fullResponse = ''

        const response = await sendChatRequestWithTools({
          modelId: selectedModelId,
          messages: currentMessages.slice(0, -1),
          systemPrompt: enhancedSystemPrompt,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          topP: settings.topP,
          signal: abortControllerRef.current?.signal,
          tools: tools.length > 0 ? tools : undefined,
          onChunk: (chunk: string) => {
            fullResponse += chunk
            updateMessage(currentAssistantId, fullResponse)
          },
        })

        if (response.content) {
          updateMessage(currentAssistantId, response.content)
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
          logger.info(`Processing ${response.toolCalls.length} tool calls`)

          const toolCallsData: ToolCallData[] = response.toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            status: 'pending' as const,
          }))
          updateMessageToolCalls(currentAssistantId, toolCallsData)
          setMessageStreaming(currentAssistantId, false)

          const results = await executeToolCalls(
            currentAssistantId,
            response.toolCalls
          )

          for (const result of results) {
            addMessage({
              role: 'tool',
              content: result.result,
              toolCallId: result.id,
              toolName: result.name,
            })
          }

          addMessage({ role: 'assistant', content: '', isStreaming: true })

          currentMessages = selectActiveMessages(useChatStore.getState())
          const newAssistantMessage = currentMessages[currentMessages.length - 1]
          if (newAssistantMessage) {
            currentAssistantId = newAssistantMessage.id
          }
        } else {
          continueLoop = false
        }
      }

      setMessageStreaming(currentAssistantId, false)
    },
    [getAvailableTools, executeToolCalls]
  )

  // Main send message handler
  const sendMessage = useCallback(
    async (content: string | ContentPart[]) => {
      const {
        addMessage,
        updateMessage,
        setMessageStreaming,
        setIsGenerating,
        setError,
        selectedModelId,
        systemPrompt,
        settings,
      } = useChatStore.getState()

      // Get model capabilities
      const currentModel = MULTIMODAL_MODELS.find(m => m.id === selectedModelId)
      const isImageGenModel = currentModel?.capabilities.imageGeneration ?? false

      // Add user message
      addMessage({ role: 'user', content })

      // Create assistant message placeholder
      addMessage({ role: 'assistant', content: '', isStreaming: true })

      setIsGenerating(true)
      setError(null)

      const currentMessages = selectActiveMessages(useChatStore.getState())
      const assistantMessage = currentMessages[currentMessages.length - 1]

      if (!assistantMessage) {
        setIsGenerating(false)
        setError('Failed to create assistant message')
        return
      }

      const currentAssistantId = assistantMessage.id
      abortControllerRef.current = new AbortController()

      try {
        if (isImageGenModel) {
          await handleImageGeneration(
            content,
            currentAssistantId,
            selectedModelId,
            abortControllerRef.current.signal
          )
        } else {
          await handleChatCompletion(
            currentAssistantId,
            selectedModelId,
            systemPrompt,
            settings
          )
        }

        setMessageStreaming(currentAssistantId, false)
      } catch (err) {
        if (isAbortError(err)) {
          logger.info('Request was cancelled by user')
          setMessageStreaming(currentAssistantId, false)
        } else {
          const errorMessage = handleError(err, 'Chat')
          options.onError?.(errorMessage)
          setError(errorMessage)
          updateMessage(currentAssistantId, `⚠️ Error: ${errorMessage}`)
          setMessageStreaming(currentAssistantId, false)
        }
      } finally {
        setIsGenerating(false)
        abortControllerRef.current = null
      }
    },
    [handleImageGeneration, handleChatCompletion, options]
  )

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Regenerate last response
  const regenerateLastResponse = useCallback(async () => {
    const { conversations, activeConversationId } = useChatStore.getState()
    const conversation = conversations.find(c => c.id === activeConversationId)
    if (!conversation || conversation.messages.length < 2) return

    const lastUserMessageIndex = conversation.messages
      .map((m, i) => ({ role: m.role, index: i }))
      .filter(m => m.role === 'user')
      .pop()?.index

    if (lastUserMessageIndex === undefined) return

    const lastUserMessage = conversation.messages[lastUserMessageIndex]
    if (!lastUserMessage) return

    // Remove the last assistant message
    useChatStore.setState(state => ({
      conversations: state.conversations.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: c.messages.slice(0, -1), updatedAt: Date.now() }
          : c
      ),
    }))

    await sendMessage(lastUserMessage.content)
  }, [sendMessage])

  return {
    sendMessage,
    stopGeneration,
    regenerateLastResponse,
    isGenerating,
    abortControllerRef,
  }
}

