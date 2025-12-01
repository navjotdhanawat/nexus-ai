import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Copy,
  Check,
  User,
  Bot,
  RotateCcw,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench,
  Image as ImageIcon,
  Download,
  Maximize2,
  Play,
  Pause,
  Volume2,
} from 'lucide-react'
import type { ChatMessage as ChatMessageType, ToolCallData } from '@/store/chat-store'
import { getContentParts, getMessageText, hasMultimodalContent } from '@/store/chat-store'
import type { ContentPart, ImageContentPart, AudioContentPart } from '@/types/multimodal'
import { getDataUri } from '@/types/multimodal'

/**
 * Represents parsed content from tool results that may contain images
 */
interface ParsedToolResultImage {
  data: string
  alt?: string
  type?: string
}

interface ParsedToolResult {
  type: 'text' | 'image' | 'mixed'
  text?: string
  images?: ParsedToolResultImage[]
}

interface ChatMessageProps {
  message: ChatMessageType
  onRegenerate?: () => void
  isLast?: boolean
}

/**
 * Image data extracted from tool results
 */
interface ExtractedImage {
  data: string
  alt: string
  type: string
}

/**
 * Convert raw base64 to data URI if needed
 */
function ensureDataUri(data: string, mimeType: string): string {
  // Already a data URI
  if (data.startsWith('data:')) {
    return data
  }
  // Raw base64 - convert to data URI
  return `data:${mimeType};base64,${data}`
}

/**
 * Helper to extract image from a parsed JSON object
 */
function extractImageFromObject(obj: Record<string, unknown>): ExtractedImage[] {
  const images: ExtractedImage[] = []

  // Handle single image object: { type: "image", image: "data:..." } or { type: "image", data: "..." }
  if (obj.type === 'image' && (obj.image || obj.data)) {
    const rawData = (obj.image || obj.data) as string
    const mimeType = (obj.mimeType || 'image/png') as string
    images.push({
      data: ensureDataUri(rawData, mimeType),
      alt: (obj.name || obj.alt || 'Generated image') as string,
      type: mimeType,
    })
    return images
  }

  // Handle array of content
  const contentArray = Array.isArray(obj) ? obj : (obj.content as unknown[])
  if (Array.isArray(contentArray)) {
    for (const item of contentArray) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>
        if (itemObj.type === 'image' && (itemObj.image || itemObj.data)) {
          const rawData = (itemObj.image || itemObj.data) as string
          const mimeType = (itemObj.mimeType || 'image/png') as string
          images.push({
            data: ensureDataUri(rawData, mimeType),
            alt: (itemObj.name || itemObj.alt || 'Generated image') as string,
            type: mimeType,
          })
        }
      }
    }
  }

  return images
}

/**
 * Parses tool result to detect images and other content types
 */
function parseToolResult(result: string): ParsedToolResult {
  const images: ExtractedImage[] = []
  const textParts: string[] = []

  // Try to parse the entire result as JSON first
  try {
    const parsed = JSON.parse(result)
    if (parsed && typeof parsed === 'object') {
      const extractedImages = extractImageFromObject(
        parsed as Record<string, unknown>
      )
      if (extractedImages.length > 0) {
        return { type: 'image', images: extractedImages }
      }
    }
  } catch {
    // Not pure JSON, continue with mixed content parsing
  }

  // Split by lines and look for JSON objects within text
  const lines = result.split('\n')
  let pendingJsonLines: string[] = []
  let inJsonObject = false
  let braceCount = 0

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check if line starts a JSON object
    if (!inJsonObject && trimmedLine.startsWith('{')) {
      inJsonObject = true
      braceCount = 0
      pendingJsonLines = []
    }

    if (inJsonObject) {
      pendingJsonLines.push(line)
      // Count braces to find the end of JSON
      for (const char of trimmedLine) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
      }

      // If braces are balanced, try to parse as JSON
      if (braceCount === 0) {
        const jsonStr = pendingJsonLines.join('\n')
        try {
          const parsed = JSON.parse(jsonStr)
          if (parsed && typeof parsed === 'object') {
            const extractedImages = extractImageFromObject(
              parsed as Record<string, unknown>
            )
            if (extractedImages.length > 0) {
              images.push(...extractedImages)
            } else {
              // Not an image object, add as text
              textParts.push(jsonStr)
            }
          }
        } catch {
          // Invalid JSON, add as text
          textParts.push(jsonStr)
        }
        inJsonObject = false
        pendingJsonLines = []
      }
    } else if (trimmedLine) {
      textParts.push(line)
    }
  }

  // Handle any remaining pending JSON lines
  if (pendingJsonLines.length > 0) {
    textParts.push(pendingJsonLines.join('\n'))
  }

  // Check for raw base64 image patterns in text parts
  const text = textParts.join('\n')
  const base64ImageRegex =
    /data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+/g
  const matches = text.match(base64ImageRegex)

  if (matches && matches.length > 0) {
    for (const data of matches) {
      images.push({
        data,
        alt: 'Generated image',
        type: data.includes('svg') ? 'image/svg+xml' : 'image/png',
      })
    }
    // Remove base64 data from text display
    const cleanText = text.replace(base64ImageRegex, '[Image]').trim()
    if (cleanText && cleanText !== '[Image]') {
      return { type: 'mixed', images, text: cleanText }
    }
    return { type: 'image', images }
  }

  // Return based on what we found
  if (images.length > 0 && textParts.length > 0 && textParts.some(t => t.trim())) {
    return {
      type: 'mixed',
      images,
      text: textParts.filter(t => t.trim()).join('\n'),
    }
  } else if (images.length > 0) {
    return { type: 'image', images }
  }

  return { type: 'text', text: result }
}

/**
 * Component to display an image with zoom and download capabilities
 */
function ImageDisplay({ data, alt }: { data: string; alt: string }) {
  const [isZoomed, setIsZoomed] = useState(false)

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = data
    link.download = `${alt.replace(/\s+/g, '_')}_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [data, alt])

  return (
    <div className="group relative">
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-border/50 bg-zinc-900 transition-all',
          isZoomed
            ? 'fixed inset-4 z-50 flex items-center justify-center bg-black/90'
            : ''
        )}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <img
          src={data}
          alt={alt}
          className={cn(
            'cursor-pointer object-contain transition-transform',
            isZoomed
              ? 'max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)]'
              : 'max-h-[400px] max-w-full'
          )}
        />
      </div>

      {/* Action buttons */}
      <div
        className={cn(
          'absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
          isZoomed && 'opacity-100'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              className="h-7 w-7 bg-zinc-800/90 backdrop-blur hover:bg-zinc-700"
              onClick={e => {
                e.stopPropagation()
                setIsZoomed(!isZoomed)
              }}
            >
              <Maximize2 className="h-3.5 w-3.5 text-zinc-200" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isZoomed ? 'Close' : 'Zoom'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              className="h-7 w-7 bg-zinc-800/90 backdrop-blur hover:bg-zinc-700"
              onClick={e => {
                e.stopPropagation()
                handleDownload()
              }}
            >
              <Download className="h-3.5 w-3.5 text-zinc-200" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>

      {/* Overlay for zoomed state */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-40 bg-black/80"
          onClick={() => setIsZoomed(false)}
        />
      )}
    </div>
  )
}

/**
 * Audio player component for message attachments
 */
function AudioPlayer({ audio }: { audio: AudioContentPart }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(audio.duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const audioSrc = audio.blobUrl || (audio.data ? getDataUri(audio.data, audio.mimeType) : '')

  useEffect(() => {
    const audioEl = audioRef.current
    if (!audioEl) return

    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime)
    const handleDurationChange = () => setDuration(audioEl.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audioEl.addEventListener('timeupdate', handleTimeUpdate)
    audioEl.addEventListener('durationchange', handleDurationChange)
    audioEl.addEventListener('ended', handleEnded)

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate)
      audioEl.removeEventListener('durationchange', handleDurationChange)
      audioEl.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audioEl = audioRef.current
    if (!audioEl) return

    if (isPlaying) {
      audioEl.pause()
    } else {
      audioEl.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-3">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <Button
        variant="ghost"
        size="icon-sm"
        className="h-10 w-10 shrink-0 rounded-full bg-violet-500/20 hover:bg-violet-500/30"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 text-violet-500" />
        ) : (
          <Play className="h-5 w-5 text-violet-500" />
        )}
      </Button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">
            {audio.filename || 'Voice message'}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-violet-500/20">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders message attachments (images, audio)
 */
function MessageAttachments({ parts }: { parts: ContentPart[] }) {
  const images = parts.filter((p): p is ImageContentPart => p.type === 'image')
  const audios = parts.filter((p): p is AudioContentPart => p.type === 'audio')

  if (images.length === 0 && audios.length === 0) return null

  return (
    <div className="mb-3 space-y-2">
      {/* Images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => {
            const src = img.data
              ? getDataUri(img.data, img.mimeType)
              : img.url || ''
            return (
              <ImageDisplay
                key={idx}
                data={src}
                alt={img.alt || img.filename || `Image ${idx + 1}`}
              />
            )
          })}
        </div>
      )}

      {/* Audio */}
      {audios.map((audio, idx) => (
        <AudioPlayer key={idx} audio={audio} />
      ))}
    </div>
  )
}

/**
 * Renders the tool result content, handling images and text
 */
function ToolResultContent({
  result,
  isError,
}: {
  result: string
  isError: boolean
}) {
  const parsed = useMemo(() => parseToolResult(result), [result])

  if (isError) {
    return (
      <div className="max-w-full overflow-x-auto rounded bg-destructive/10">
        <pre className="overflow-hidden whitespace-pre-wrap break-all p-2 text-xs text-destructive">
          {result}
        </pre>
      </div>
    )
  }

  if (parsed.type === 'image' && parsed.images) {
    return (
      <div className="space-y-3">
        {parsed.images.map((img, idx) => (
          <ImageDisplay
            key={idx}
            data={img.data}
            alt={img.alt || `Image ${idx + 1}`}
          />
        ))}
      </div>
    )
  }

  if (parsed.type === 'mixed' && parsed.images) {
    return (
      <div className="space-y-3">
        {parsed.text && (
          <div className="max-w-full overflow-x-auto rounded bg-zinc-950 dark:bg-zinc-900">
            <pre className="overflow-hidden whitespace-pre-wrap break-all p-2 text-xs text-zinc-300">
              {parsed.text}
            </pre>
          </div>
        )}
        {parsed.images.map((img, idx) => (
          <ImageDisplay
            key={idx}
            data={img.data}
            alt={img.alt || `Image ${idx + 1}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-full overflow-x-auto rounded bg-zinc-950 dark:bg-zinc-900">
      <pre className="overflow-hidden whitespace-pre-wrap break-all p-2 text-xs text-zinc-300">
        {result}
      </pre>
    </div>
  )
}

/**
 * Renders a tool call with its status and result
 */
function ToolCallDisplay({ toolCall }: { toolCall: ToolCallData }) {
  const [expanded, setExpanded] = useState(true)

  // Check if result contains an image to show indicator
  const hasImage = useMemo(() => {
    if (!toolCall.result) return false
    const parsed = parseToolResult(toolCall.result)
    return parsed.type === 'image' || parsed.type === 'mixed'
  }, [toolCall.result])

  const statusIcon = {
    pending: (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    ),
    executing: <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />,
    success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  }

  const statusLabel = {
    pending: 'Pending',
    executing: 'Executing...',
    success: 'Completed',
    error: 'Failed',
  }

  return (
    <div className="my-2 max-w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
      >
        {hasImage ? (
          <ImageIcon className="h-4 w-4 text-emerald-500" />
        ) : (
          <Terminal className="h-4 w-4 text-violet-500" />
        )}
        <span className="flex-1 font-mono text-sm font-medium">
          {toolCall.name}
        </span>
        {hasImage && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
            Image
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {statusIcon[toolCall.status]}
          {statusLabel[toolCall.status]}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/50">
          {/* Arguments */}
          <div className="border-b border-border/30 px-3 py-2">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Arguments
            </div>
            <div className="overflow-x-auto rounded bg-zinc-950 dark:bg-zinc-900">
              <pre className="whitespace-pre p-2 text-xs text-zinc-300">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
          </div>

          {/* Result */}
          {toolCall.result && (
            <div className="max-w-full overflow-hidden px-3 py-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Result
              </div>
              <ToolResultContent
                result={toolCall.result}
                isError={toolCall.status === 'error'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Renders message content using MarkdownRenderer for proper formatting
 */
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

function MessageContent({ content }: { content: string }) {
  // Empty content
  if (!content.trim()) {
    return null
  }

  return <MarkdownRenderer content={content} />
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onRegenerate,
  isLast,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isTool = message.role === 'tool'

  // Get content parts and text
  const contentParts = getContentParts(message)
  const textContent = getMessageText(message)
  const hasAttachments = hasMultimodalContent(message)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [textContent])

  // Don't render tool result messages in the main UI (they're shown in tool calls)
  if (isTool) {
    return null
  }

  return (
    <div
      className={cn(
        'group relative flex w-full max-w-full gap-4 overflow-hidden px-4 py-6',
        isUser && 'bg-transparent',
        isAssistant && 'bg-muted/30'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser && 'bg-primary text-primary-foreground',
          isAssistant &&
            'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Role label */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.isStreaming && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Generating...
            </span>
          )}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-violet-500">
              <Wrench className="h-3 w-3" />
              Using {message.toolCalls.length} tool
              {message.toolCalls.length > 1 ? 's' : ''}
            </span>
          )}
          {hasAttachments && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              Attachments
            </span>
          )}
        </div>

        {/* Attachments (images, audio) */}
        <MessageAttachments parts={contentParts} />

        {/* Content */}
        <div className="max-w-full overflow-hidden text-sm text-foreground/90">
          <MessageContent content={textContent} />
          {message.isStreaming && !textContent && (
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3">
            {message.toolCalls.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Actions */}
        {!message.isStreaming && (
          <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? 'Copied!' : 'Copy message'}
              </TooltipContent>
            </Tooltip>

            {isAssistant && isLast && onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={onRegenerate}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate response</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default ChatMessage
