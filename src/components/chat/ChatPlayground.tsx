/**
 * Chat Playground Component
 * Main chat interface with model selection and MCP tool support
 */

import { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ModelSelector } from './ModelSelector'
import {
  Trash2,
  Plus,
  Terminal,
  Loader2,
  Image,
  Mic,
  ImagePlus,
  Download,
  FileJson,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import {
  exportConversation,
  copyConversationToClipboard,
  type ExportFormat,
} from '@/lib/chat-export'
import { toast } from 'sonner'
import {
  useChatStore,
  selectActiveMessages,
  selectSelectedModel,
  selectSelectedMultimodalModel,
  selectActiveConversation,
} from '@/store/chat-store'
import { useMCPStore } from '@/store/mcp-store'
import { useChatActions } from '@/hooks/use-chat-actions'
import { startAllEnabledServers, stopAllServers } from '@/services/mcp'
import { logger } from '@/lib/logger'
import type { MCPTool } from '@/types/mcp'

// ============================================
// Component
// ============================================

export function ChatPlayground() {
  const [mcpInitializing, setMcpInitializing] = useState(false)
  const [exportCopied, setExportCopied] = useState(false)

  // Store selectors
  const messages = useChatStore(selectActiveMessages)
  const selectedModel = useChatStore(selectSelectedModel)
  const multimodalModel = useChatStore(selectSelectedMultimodalModel)
  const activeConversation = useChatStore(selectActiveConversation)
  const isGenerating = useChatStore(state => state.isGenerating)
  const error = useChatStore(state => state.error)
  const selectedModelId = useChatStore(state => state.selectedModelId)
  const activeConversationId = useChatStore(state => state.activeConversationId)

  // MCP store selectors
  const mcpServers = useMCPStore(state => state.servers)
  const mcpServerStates = useMCPStore(state => state.serverStates)
  const enabledServers = mcpServers.filter(s => s.enabled)

  // Use chat actions hook
  const { sendMessage, stopGeneration, regenerateLastResponse } = useChatActions()

  // Get model capabilities
  const supportsVision = multimodalModel?.capabilities.vision ?? false
  const supportsAudio = multimodalModel?.capabilities.audioTranscription ?? false
  const supportsImageGeneration = multimodalModel?.capabilities.imageGeneration ?? false

  // Get all available tools from connected MCP servers
  const getAvailableTools = useCallback((): MCPTool[] => {
    const tools: MCPTool[] = []
    for (const server of enabledServers) {
      const state = mcpServerStates.get(server.id)
      if (state?.status === 'connected' && state.tools) {
        tools.push(...state.tools)
      }
    }
    return tools
  }, [enabledServers, mcpServerStates])

  // Check if MCP is connected
  const isMcpConnected = enabledServers.some(
    s => mcpServerStates.get(s.id)?.status === 'connected'
  )

  // Initialize MCP servers on mount
  useEffect(() => {
    const { servers } = useMCPStore.getState()
    const enabled = servers.filter(s => s.enabled)

    const initMCP = async () => {
      if (enabled.length === 0) return

      setMcpInitializing(true)
      try {
        await startAllEnabledServers()
        logger.info('MCP servers initialized')
      } catch (err) {
        logger.error('Failed to initialize MCP servers', { error: err })
      } finally {
        setMcpInitializing(false)
      }
    }

    initMCP()

    return () => {
      stopAllServers().catch(err => {
        logger.error('Failed to stop MCP servers', { error: err })
      })
    }
  }, [])

  // Handlers
  const handleClearChat = useCallback(() => {
    useChatStore.getState().clearMessages()
  }, [])

  const handleNewChat = useCallback(() => {
    useChatStore.getState().createConversation()
  }, [])

  const handleModelChange = useCallback((modelId: string) => {
    useChatStore.getState().setSelectedModel(modelId)
  }, [])

  const handleRestartMCP = useCallback(async () => {
    setMcpInitializing(true)
    try {
      await stopAllServers()
      await startAllEnabledServers()
      logger.info('MCP servers restarted')
    } catch (err) {
      logger.error('Failed to restart MCP servers', { error: err })
    } finally {
      setMcpInitializing(false)
    }
  }, [])

  // Export handlers
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!activeConversation) {
        toast.error('No conversation to export')
        return
      }

      const result = await exportConversation(activeConversation, {
        format,
        includeSystemPrompt: true,
        includeMetadata: true,
        includeTimestamps: true,
      })

      if (result.success) {
        toast.success(`Exported to ${format.toUpperCase()}`, {
          description: result.filePath
            ? `Saved to ${result.filePath.split('/').pop()}`
            : undefined,
        })
      } else if (result.error !== 'Export cancelled') {
        toast.error('Export failed', { description: result.error })
      }
    },
    [activeConversation]
  )

  const handleCopyConversation = useCallback(
    async (format: ExportFormat) => {
      if (!activeConversation) {
        toast.error('No conversation to copy')
        return
      }

      const result = await copyConversationToClipboard(activeConversation, {
        format,
        includeSystemPrompt: true,
        includeMetadata: true,
        includeTimestamps: false,
      })

      if (result.success) {
        setExportCopied(true)
        setTimeout(() => setExportCopied(false), 2000)
        toast.success(`Copied as ${format.toUpperCase()}`)
      } else {
        toast.error('Copy failed', { description: result.error })
      }
    },
    [activeConversation]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelChange={handleModelChange}
            disabled={isGenerating}
          />
          {selectedModel && (
            <div className="hidden items-center gap-2 sm:flex">
              {/* Capability badges */}
              {supportsImageGeneration && (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-pink-500/30 bg-pink-500/10 px-1.5 text-[10px] text-pink-600 dark:text-pink-400"
                >
                  <ImagePlus className="h-3 w-3" />
                  Image Gen
                </Badge>
              )}
              {supportsVision && (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-violet-500/30 bg-violet-500/10 px-1.5 text-[10px] text-violet-600 dark:text-violet-400"
                >
                  <Image className="h-3 w-3" />
                  Vision
                </Badge>
              )}
              {supportsAudio && (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400"
                >
                  <Mic className="h-3 w-3" />
                  Audio
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* MCP Status Indicator */}
          {enabledServers.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`h-8 w-8 ${
                    isMcpConnected
                      ? 'text-emerald-500'
                      : mcpInitializing
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                  }`}
                  onClick={handleRestartMCP}
                  disabled={mcpInitializing}
                >
                  {mcpInitializing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Terminal className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {mcpInitializing
                  ? 'Connecting to MCP servers...'
                  : isMcpConnected
                    ? `MCP Connected (${getAvailableTools().length} tools)`
                    : 'MCP Disconnected - Click to reconnect'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Export Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    disabled={!activeConversation || messages.length === 0}
                  >
                    {exportCopied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export conversation</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport('markdown')}>
                <FileText className="mr-2 h-4 w-4" />
                Save as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="mr-2 h-4 w-4" />
                Save as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCopyConversation('markdown')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyConversation('json')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleClearChat}
                disabled={isGenerating || messages.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear conversation</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleNewChat}
                disabled={isGenerating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New conversation</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          onRegenerate={regenerateLastResponse}
        />
      </div>

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        modelId={selectedModelId}
        placeholder={
          !activeConversationId
            ? 'Start a new conversation...'
            : `Message ${selectedModel?.name || 'AI'}...`
        }
      />
    </div>
  )
}

export default ChatPlayground
