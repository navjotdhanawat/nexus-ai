import { useRef, useCallback, useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Paperclip,
  Image,
  Mic,
  Camera,
  File,
  X,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentPart, ImageContentPart, AudioContentPart } from '@/types/multimodal'
import {
  fileToImageContent,
  fileToAudioContent,
  modelSupportsVision,
  modelSupportsAudio,
  getMaxImageSize,
  isImageTypeSupported,
  isAudioTypeSupported,
} from '@/types/multimodal'
import { logger } from '@/lib/logger'

interface AttachmentMenuProps {
  modelId: string
  onAttachmentsChange: (attachments: ContentPart[]) => void
  attachments: ContentPart[]
  disabled?: boolean
  onRecordAudio?: () => void
}

interface AttachmentPreviewProps {
  attachment: ContentPart
  onRemove: () => void
}

/**
 * Preview component for attachments
 */
function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  if (attachment.type === 'image') {
    const imgData = attachment as ImageContentPart
    const src = imgData.data
      ? `data:${imgData.mimeType};base64,${imgData.data}`
      : imgData.url

    return (
      <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/50">
        <img
          src={src}
          alt={imgData.alt || 'Attached image'}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
          <span className="text-[10px] font-medium text-white">
            {imgData.filename || 'Image'}
          </span>
        </div>
      </div>
    )
  }

  if (attachment.type === 'audio') {
    const audioData = attachment as AudioContentPart
    const durationStr = audioData.duration
      ? `${Math.floor(audioData.duration / 60)}:${String(Math.floor(audioData.duration % 60)).padStart(2, '0')}`
      : ''

    return (
      <div className="group relative flex h-16 w-32 shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
          <Mic className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium">
            {audioData.filename || 'Audio'}
          </p>
          {durationStr && (
            <p className="text-[10px] text-muted-foreground">{durationStr}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return null
}

/**
 * Attachment menu for adding images and audio to messages
 */
export const AttachmentMenu = memo(function AttachmentMenu({
  modelId,
  onAttachmentsChange,
  attachments,
  disabled,
  onRecordAudio,
}: AttachmentMenuProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const supportsVision = modelSupportsVision(modelId)
  const supportsAudio = modelSupportsAudio(modelId)
  const maxImageSize = getMaxImageSize(modelId)

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setError(null)

      try {
        const newAttachments: ContentPart[] = []

        for (const file of Array.from(files)) {
          // Validate file type
          if (!isImageTypeSupported(modelId, file.type)) {
            setError(`Unsupported image format: ${file.type}`)
            continue
          }

          // Validate file size
          if (file.size > maxImageSize) {
            setError(
              `Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${maxImageSize / 1024 / 1024}MB)`
            )
            continue
          }

          const imageContent = await fileToImageContent(file)
          newAttachments.push(imageContent)
        }

        if (newAttachments.length > 0) {
          onAttachmentsChange([...attachments, ...newAttachments])
        }
      } catch (err) {
        logger.error('Failed to process image', { error: err })
        setError('Failed to process image')
      }

      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
      setOpen(false)
    },
    [modelId, maxImageSize, attachments, onAttachmentsChange]
  )

  const handleAudioSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setError(null)

      try {
        const newAttachments: ContentPart[] = []

        for (const file of Array.from(files)) {
          // Validate file type
          if (!isAudioTypeSupported(modelId, file.type)) {
            setError(`Unsupported audio format: ${file.type}`)
            continue
          }

          const audioContent = await fileToAudioContent(file)
          newAttachments.push(audioContent)
        }

        if (newAttachments.length > 0) {
          onAttachmentsChange([...attachments, ...newAttachments])
        }
      } catch (err) {
        logger.error('Failed to process audio', { error: err })
        setError('Failed to process audio')
      }

      // Reset input
      if (audioInputRef.current) {
        audioInputRef.current.value = ''
      }
      setOpen(false)
    },
    [modelId, attachments, onAttachmentsChange]
  )

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      const newAttachments = attachments.filter((_, i) => i !== index)
      onAttachmentsChange(newAttachments)
    },
    [attachments, onAttachmentsChange]
  )

  const handleCameraCapture = useCallback(() => {
    // Create a file input with capture attribute
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const imageContent = await fileToImageContent(file)
          onAttachmentsChange([...attachments, imageContent])
        } catch (err) {
          logger.error('Failed to capture image', { error: err })
          setError('Failed to capture image')
        }
      }
    }
    input.click()
    setOpen(false)
  }, [attachments, onAttachmentsChange])

  const handleRecordAudio = useCallback(() => {
    setOpen(false)
    onRecordAudio?.()
  }, [onRecordAudio])

  // If model doesn't support any attachments
  if (!supportsVision && !supportsAudio) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 shrink-0 text-muted-foreground/50"
            disabled
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          This model doesn&apos;t support attachments
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {attachments.map((attachment, index) => (
            <AttachmentPreview
              key={index}
              attachment={attachment}
              onRemove={() => handleRemoveAttachment(index)}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/wav,audio/mp3,audio/mpeg,audio/webm,audio/ogg,audio/flac"
        className="hidden"
        onChange={handleAudioSelect}
      />

      {/* Attachment button with popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground',
              attachments.length > 0 && 'text-violet-500'
            )}
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2"
          side="top"
          align="start"
          sideOffset={8}
        >
          <div className="flex flex-col gap-1">
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              Add attachment
            </p>

            {supportsVision && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Image className="h-4 w-4 text-violet-500" />
                  Upload Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={handleCameraCapture}
                >
                  <Camera className="h-4 w-4 text-blue-500" />
                  Take Photo
                </Button>
              </>
            )}

            {supportsAudio && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={handleRecordAudio}
                >
                  <Mic className="h-4 w-4 text-emerald-500" />
                  Record Audio
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <File className="h-4 w-4 text-amber-500" />
                  Upload Audio
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
})

export default AttachmentMenu


