import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Send, Square, Image, Mic, X } from 'lucide-react'
import { AttachmentMenu } from './AttachmentMenu'
import { AudioRecorder } from './AudioRecorder'
import type { ContentPart, AudioContentPart, ImageContentPart } from '@/types/multimodal'
import { modelSupportsVision, modelSupportsAudio, getDataUri } from '@/types/multimodal'
import { createMessageContent } from '@/store/chat-store'

interface MessageInputProps {
  onSend: (content: string | ContentPart[]) => void
  onStop?: () => void
  isGenerating: boolean
  disabled?: boolean
  placeholder?: string
  modelId: string
}

/**
 * Preview component for image attachments
 */
function ImagePreview({
  image,
  onRemove,
}: {
  image: ImageContentPart
  onRemove: () => void
}) {
  const src = image.data
    ? getDataUri(image.data, image.mimeType)
    : image.url

  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
      <img
        src={src}
        alt={image.alt || 'Attached image'}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

/**
 * Preview component for audio attachments
 */
function AudioPreview({
  audio,
  onRemove,
}: {
  audio: AudioContentPart
  onRemove: () => void
}) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="group relative flex h-20 w-40 shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 px-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
        <Mic className="h-5 w-5 text-violet-500" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">
          {audio.filename || 'Voice message'}
        </p>
        {audio.duration && (
          <p className="text-xs text-muted-foreground">
            {formatDuration(audio.duration)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export const MessageInput = memo(function MessageInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
  placeholder = 'Send a message...',
  modelId,
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ContentPart[]>([])
  const [audioRecorderOpen, setAudioRecorderOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supportsVision = modelSupportsVision(modelId)
  const supportsAudio = modelSupportsAudio(modelId)
  const hasCapabilities = supportsVision || supportsAudio

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${newHeight}px`
    }
  }, [message])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim()
    if ((!trimmed && attachments.length === 0) || isGenerating || disabled) return

    // Create message content
    const content = createMessageContent(trimmed, attachments)
    onSend(content)

    // Reset state
    setMessage('')
    setAttachments([])

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, attachments, isGenerating, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!supportsVision) return

      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            try {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                const base64Data = result.includes(',')
                  ? result.split(',')[1]
                  : result
                const imageContent: ImageContentPart = {
                  type: 'image',
                  data: base64Data,
                  mimeType: file.type,
                  filename: 'Pasted image',
                }
                setAttachments(prev => [...prev, imageContent])
              }
              reader.readAsDataURL(file)
            } catch (err) {
              console.error('Failed to paste image:', err)
            }
          }
          break
        }
      }
    },
    [supportsVision]
  )

  const handleAudioReady = useCallback((audio: AudioContentPart) => {
    setAttachments(prev => [...prev, audio])
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const canSend =
    (message.trim().length > 0 || attachments.length > 0) &&
    !isGenerating &&
    !disabled

  // Separate images and audio
  const imageAttachments = attachments.filter(
    (a): a is ImageContentPart => a.type === 'image'
  )
  const audioAttachments = attachments.filter(
    (a): a is AudioContentPart => a.type === 'audio'
  )

  return (
    <div className="relative border-t border-border/50 bg-background px-4 py-4">
      {/* Audio Recorder Modal */}
      {supportsAudio && (
        <AudioRecorder
          isOpen={audioRecorderOpen}
          onClose={() => setAudioRecorderOpen(false)}
          onAudioReady={handleAudioReady}
        />
      )}

      <div className="mx-auto max-w-3xl">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {imageAttachments.map((img, index) => (
              <ImagePreview
                key={`img-${index}`}
                image={img}
                onRemove={() =>
                  handleRemoveAttachment(attachments.indexOf(img))
                }
              />
            ))}
            {audioAttachments.map((audio, index) => (
              <AudioPreview
                key={`audio-${index}`}
                audio={audio}
                onRemove={() =>
                  handleRemoveAttachment(attachments.indexOf(audio))
                }
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            'relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-all',
            'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
            disabled && 'opacity-50'
          )}
        >
          {/* Attachment Menu */}
          {hasCapabilities && (
            <AttachmentMenu
              modelId={modelId}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={disabled || isGenerating}
              onRecordAudio={() => setAudioRecorderOpen(true)}
            />
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            style={{ height: 'auto' }}
          />

          {/* Capability indicators */}
          {hasCapabilities && attachments.length === 0 && !message && (
            <div className="hidden items-center gap-1 pr-1 sm:flex">
              {supportsVision && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50">
                      <Image className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Supports images</TooltipContent>
                </Tooltip>
              )}
              {supportsAudio && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50">
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Supports audio</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Send/Stop button */}
          {isGenerating ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0"
                  onClick={onStop}
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop generating</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={canSend ? 'default' : 'ghost'}
                  size="icon-sm"
                  className={cn(
                    'h-8 w-8 shrink-0 transition-all',
                    !canSend && 'text-muted-foreground'
                  )}
                  onClick={handleSubmit}
                  disabled={!canSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canSend ? 'Send message (Enter)' : 'Type a message'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Helper text */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press{' '}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{' '}
          to send,{' '}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            Shift + Enter
          </kbd>{' '}
          for new line
          {supportsVision && (
            <>
              {' · '}
              <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                ⌘V
              </kbd>{' '}
              to paste images
            </>
          )}
        </p>
      </div>
    </div>
  )
})

export default MessageInput
